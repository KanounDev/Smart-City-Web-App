package com.example.smartcity.controller;

import com.example.smartcity.model.ServiceRequest;
import com.example.smartcity.repository.RequestRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.ArrayList;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import java.io.InputStream; // New: For serving files
import org.springframework.core.io.InputStreamResource; // New: For download

@RestController
@RequestMapping("/api/requests")
@CrossOrigin(origins = "http://localhost:4200")
public class RequestController {
    private final RequestRepository repository;
    private final SimpMessagingTemplate messagingTemplate;

    private final String uploadDir = "uploads/requests/";

    public RequestController(RequestRepository repository, SimpMessagingTemplate messagingTemplate) {
        this.repository = repository;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping("/approved")
    public List<ServiceRequest> getApproved() {
        return repository.findByStatus("APPROVED");
    }

    @GetMapping("/my")
    public List<ServiceRequest> getMyRequests(Authentication auth) {
        String ownerId;
        try {
            com.example.smartcity.model.User user = (com.example.smartcity.model.User) auth.getPrincipal();
            ownerId = user.id;
        } catch (Exception e) {
            System.err.println("Failed to get ownerId from principal: " + e.getMessage());
            return new ArrayList<>();
        }

        System.out.println("Fetching requests for Owner ID: " + ownerId);

        List<ServiceRequest> requests = repository.findByOwnerId(ownerId);

        // ── ADD THESE LINES ────────────────────────────────────────────────
        System.out.println("Found " + requests.size() + " requests");
        if (!requests.isEmpty()) {
            System.out.println("First request ID: " + requests.get(0).id);
            System.out.println("First request ownerId: " + requests.get(0).ownerId);
            System.out.println("First request name: " + requests.get(0).name);
        } else {
            System.out.println("No requests found for this ownerId in database");
        }
        // ───────────────────────────────────────────────────────────────────

        return requests;
    }

    @PostMapping("/{id}/documents")
    public ResponseEntity<ServiceRequest> addDocuments(@PathVariable String id,
            @RequestParam("additionalDocuments") List<MultipartFile> documents, Authentication auth) {
        String currentUserId = ((com.example.smartcity.model.User) auth.getPrincipal()).id;

        return repository.findById(id).<ResponseEntity<ServiceRequest>>map(existing -> {
            if (!existing.ownerId.equals(currentUserId) || !"PENDING".equals(existing.status)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).<ServiceRequest>build();
            }

            String requestUploadDir = uploadDir + id + "/";
            try {
                Files.createDirectories(Paths.get(requestUploadDir));
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }

            for (MultipartFile file : documents) {
                if (!file.isEmpty()) {
                    try {
                        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
                        Path filePath = Paths.get(requestUploadDir + fileName);
                        Files.copy(file.getInputStream(), filePath);
                        existing.documents.add(requestUploadDir + fileName);
                    } catch (IOException e) {
                        System.err.println("Failed to save file: " + file.getOriginalFilename());
                    }
                }
            }

            ServiceRequest saved = repository.save(existing);
            messagingTemplate.convertAndSend("/topic/requests", saved);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    // New: Delete a specific document (Owner only)
    @DeleteMapping("/{id}/documents/{index}")
    public ResponseEntity<ServiceRequest> deleteDocument(@PathVariable String id, @PathVariable int index,
            Authentication auth) {
        String currentUserId = ((com.example.smartcity.model.User) auth.getPrincipal()).id;

        return repository.findById(id).map(existing -> {
            if (!existing.ownerId.equals(currentUserId) || !"PENDING".equals(existing.status)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).<ServiceRequest>build();
            }

            if (index < 0 || index >= existing.documents.size()) {
                return ResponseEntity.badRequest().<ServiceRequest>build();
            }

            String filePath = existing.documents.get(index);
            try {
                Files.deleteIfExists(Paths.get(filePath)); // Delete from disk
            } catch (IOException e) {
                System.err.println("Failed to delete file: " + filePath);
            }

            existing.documents.remove(index);
            ServiceRequest saved = repository.save(existing);
            messagingTemplate.convertAndSend("/topic/requests", saved);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().<ServiceRequest>build());
    }

    // New: Download a specific document (Owner or Admin)
    @GetMapping("/{id}/documents/{index}")
    public ResponseEntity<InputStreamResource> downloadDocument(@PathVariable String id, @PathVariable int index,
            Authentication auth) {
        String currentUserId = ((com.example.smartcity.model.User) auth.getPrincipal()).id;
        String currentRole = ((com.example.smartcity.model.User) auth.getPrincipal()).role.toString(); // Assuming role
                                                                                                       // in User

        return repository.findById(id).map(existing -> {
            boolean isOwner = existing.ownerId.equals(currentUserId);
            boolean isAdmin = "ADMIN".equals(currentRole);
            if (!isOwner && !isAdmin) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).<InputStreamResource>build();
            }

            if (index < 0 || index >= existing.documents.size()) {
                return ResponseEntity.badRequest().<InputStreamResource>build();
            }

            String filePath = existing.documents.get(index);
            try {
                Path path = Paths.get(filePath);
                InputStream inputStream = Files.newInputStream(path);
                return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"" + path.getFileName().toString() + "\"")
                        .body(new InputStreamResource(inputStream));
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).<InputStreamResource>build();
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // Updated: Now handles multipart form data (fields + files)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ServiceRequest> submitRequest(
            @RequestParam("name") String name,
            @RequestParam("description") String description,
            @RequestParam("category") String category,
            @RequestParam("address") String address,
            @RequestParam(value = "documents", required = false) List<MultipartFile> documents,
            Authentication auth) {

        String ownerId = ((com.example.smartcity.model.User) auth.getPrincipal()).id;

        // Create new request object
        ServiceRequest request = new ServiceRequest();
        request.name = name;
        request.description = description;
        request.category = category;
        request.address = address;
        request.ownerId = ownerId;
        request.status = "PENDING";
        request.documents = new ArrayList<>(); // Initialize empty list

        // Save request first to get ID
        ServiceRequest savedRequest = repository.save(request);

        // Handle file uploads if provided
        if (documents != null && !documents.isEmpty()) {
            String requestUploadDir = uploadDir + savedRequest.id + "/";
            try {
                Files.createDirectories(Paths.get(requestUploadDir)); // Create dir if needed
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }

            for (MultipartFile file : documents) {
                if (!file.isEmpty()) {
                    try {
                        // Generate unique file name
                        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
                        Path filePath = Paths.get(requestUploadDir + fileName);
                        Files.copy(file.getInputStream(), filePath);

                        // Add relative path to documents list
                        savedRequest.documents.add(requestUploadDir + fileName);
                    } catch (IOException e) {
                        // Log error, but continue with other files
                        System.err.println("Failed to save file: " + file.getOriginalFilename());
                    }
                }
            }

            // Save updated request with document paths
            savedRequest = repository.save(savedRequest);
        }

        // REAL-TIME: Notify via WebSocket
        messagingTemplate.convertAndSend("/topic/requests", savedRequest);

        return ResponseEntity.ok(savedRequest);
    }

    @GetMapping("/admin/pending")
    public List<ServiceRequest> getPending() {
        return repository.findByStatus("PENDING");
    }

    @PutMapping("/admin/{id}")
    public ResponseEntity<ServiceRequest> updateRequest(@PathVariable String id, @RequestBody ServiceRequest updated) {
        return repository.findById(id).map(existing -> {
            existing.status = updated.status;
            existing.comments = updated.comments;
            existing.lat = updated.lat;
            existing.lng = updated.lng;

            ServiceRequest saved = repository.save(existing);

            // REAL-TIME: Notify everyone that a request changed
            messagingTemplate.convertAndSend("/topic/requests", saved);

            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    // NEW: Update Request (Owner Only)
    @PutMapping("/{id}")
    public ResponseEntity<ServiceRequest> updateRequestOwner(@PathVariable String id,
            @RequestBody ServiceRequest updated, Authentication auth) {
        String currentUserId = ((com.example.smartcity.model.User) auth.getPrincipal()).id;

        return repository.findById(id).map(existing -> {
            // Security Check: Only allow if user is the owner
            if (!existing.ownerId.equals(currentUserId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).<ServiceRequest>build();
            }

            // Update fields
            existing.name = updated.name;
            existing.description = updated.description;
            existing.category = updated.category;
            existing.address = updated.address;

            ServiceRequest saved = repository.save(existing);

            // REAL-TIME: Notify everyone that a request changed
            messagingTemplate.convertAndSend("/topic/requests", saved);

            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    // NEW: Delete Request (Owner Only)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRequest(@PathVariable String id, Authentication auth) {
        String currentUserId = ((com.example.smartcity.model.User) auth.getPrincipal()).id;

        return repository.findById(id).map(existing -> {
            if (!existing.ownerId.equals(currentUserId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).<Void>build();
            }

            repository.delete(existing);

            // REAL-TIME: Send a special message or the deleted ID so frontend can remove it
            // We can send a "status: DELETED" object or just the ID wrapped in an object
            existing.status = "DELETED";
            messagingTemplate.convertAndSend("/topic/requests", existing);

            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }
}