package com.example.smartcity.controller;

import com.example.smartcity.model.ServiceRequest;
import com.example.smartcity.model.User;
import com.example.smartcity.repository.RequestRepository;
import com.example.smartcity.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.core.io.InputStreamResource;

/**
 * REST controller for managing service requests.
 */
@RestController
@RequestMapping("/api/requests")
@CrossOrigin(origins = "http://localhost:4200")
public class RequestController {

    private static final Logger logger = LoggerFactory.getLogger(RequestController.class);

    private final RequestRepository repository;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    public RequestController(RequestRepository repository,
            SimpMessagingTemplate messagingTemplate,
            UserRepository userRepository) {
        this.repository = repository;
        this.messagingTemplate = messagingTemplate;
        this.userRepository = userRepository;
    }

    // ────────────────────────────────────────────────
    // GET Endpoints
    // ────────────────────────────────────────────────

    @GetMapping
    public List<ServiceRequest> getAll() {
        logger.info("Fetching all requests");
        return repository.findAll();
    }

    @GetMapping("/pending")
    public List<ServiceRequest> getPending(Authentication auth) {
        User admin = (User) auth.getPrincipal();
        String municipality = admin.municipality;
        logger.info("Fetching pending requests for municipality: {}", municipality);
        return repository.findByStatusAndMunicipality("PENDING", municipality);
    }

    @GetMapping("/approved")
    public List<ServiceRequest> getApproved(Authentication auth) {
        User admin = (User) auth.getPrincipal();
        String municipality = admin.municipality;
        logger.info("Fetching approved requests for municipality: {}", municipality);
        return repository.findByStatusAndMunicipality("APPROVED", municipality);
    }
    @GetMapping("/approved/public")
public List<ServiceRequest> getApprovedPublic() {
    logger.info("Public request for approved businesses");
    return repository.findByStatusAndLatIsNotNullAndLngIsNotNull("APPROVED");
}
    @GetMapping("/rejected")
    public List<ServiceRequest> getRejected(Authentication auth) {
        User admin = (User) auth.getPrincipal();
        String municipality = admin.municipality;
        logger.info("Fetching rejected requests for municipality: {}", municipality);
        return repository.findByStatusAndMunicipality("REJECTED", municipality);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceRequest> getById(@PathVariable String id) {
        return repository.findById(id)
                .<ResponseEntity<ServiceRequest>>map(ResponseEntity::ok)
                .orElseGet(ResponseEntity.notFound()::build);
    }

    @GetMapping("/my")
    public List<ServiceRequest> getByOwner(Authentication auth) {
        String ownerId = extractUserId(auth);
        logger.info("Fetching requests for owner: {}", ownerId);
        return repository.findByOwnerId(ownerId);
    }

    @GetMapping("/owners")
    public List<Map<String, Object>> getOwners(Authentication auth) {
        if (!isAdmin(auth)) {
            throw new IllegalStateException("Admin only");
        }
        User admin = (User) auth.getPrincipal();
        String adminMuni = admin.municipality;
        logger.info("Fetching owners list for admin in municipality: {}", adminMuni);

        List<ServiceRequest> all = repository.findByMunicipality(adminMuni);
        Set<String> ownerIds = all.stream().map(r -> r.ownerId).collect(Collectors.toSet());

        List<Map<String, Object>> owners = new ArrayList<>();
        for (String ownerId : ownerIds) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", ownerId);

            userRepository.findById(ownerId).ifPresent(user -> {
                map.put("username", user.username);
            });

            long count = all.stream().filter(r -> r.ownerId.equals(ownerId)).count();
            map.put("requestsCount", count);

            owners.add(map);
        }
        return owners;
    }

    // ────────────────────────────────────────────────
    // POST / PUT / DELETE
    // ────────────────────────────────────────────────

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ServiceRequest> submitRequest(
            @RequestPart("name") String name,
            @RequestPart("description") String description,
            @RequestPart("category") String category,
            @RequestPart("address") String address,
            @RequestPart(value = "documents", required = false) MultipartFile[] files,
            Authentication auth) {

        logger.info("New request submission from user: {}", extractUserId(auth));

        ServiceRequest request = new ServiceRequest();
        request.name = name;
        request.description = description;
        request.category = category;
        request.address = address;
        request.ownerId = extractUserId(auth);
        request.documents = new ArrayList<>();
        User owner = (User) auth.getPrincipal();
        request.municipality = owner.municipality;
        ServiceRequest saved = repository.save(request);

        if (files != null && files.length > 0) {
            Path requestDir = Paths.get("./uploads/requests/" + saved.id);
            try {
                Files.createDirectories(requestDir);
                for (MultipartFile file : files) {
                    if (file.isEmpty())
                        continue;

                    String originalName = file.getOriginalFilename();
                    String fileName = UUID.randomUUID()
                            + (originalName != null ? "_" + originalName.replaceAll("[^a-zA-Z0-9.-]", "_") : "");
                    Path filePath = requestDir.resolve(fileName);
                    file.transferTo(filePath);

                    saved.documents.add(filePath.toString());
                }
                saved = repository.save(saved);
            } catch (IOException e) {
                logger.error("File upload failed: {}", e.getMessage());
                repository.delete(saved);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }
        }

        messagingTemplate.convertAndSend("/topic/requests", saved);
        logger.info("Request submitted successfully: ID {}", saved.id);
        return ResponseEntity.ok(saved);
    }
@PutMapping("/admin/{id}")
public ResponseEntity<ServiceRequest> updateAdmin(@PathVariable String id,
                                                  @RequestBody Map<String, Object> payload,
                                                  Authentication auth) {
    if (!isAdmin(auth)) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    User admin = (User) auth.getPrincipal();
    logger.info("Admin {} updating request {}", admin.id, id);

    return repository.findById(id)
        .<ResponseEntity<ServiceRequest>>map(request -> {
            // Check municipality match
            if (!admin.municipality.equals(request.municipality)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            // Apply updates from payload
            if (payload.containsKey("status")) {
                request.status = (String) payload.get("status").toString().toUpperCase();
            }
            if (payload.containsKey("comments")) {
                request.comments = (String) payload.get("comments");
            }
            if (payload.containsKey("lat")) {
                Object latVal = payload.get("lat");
                request.lat = (latVal != null && latVal instanceof Number) ? ((Number) latVal).doubleValue() : null;
            }
            if (payload.containsKey("lng")) {
                Object lngVal = payload.get("lng");
                request.lng = (lngVal != null && lngVal instanceof Number) ? ((Number) lngVal).doubleValue() : null;
            }

            ServiceRequest updated = repository.save(request);
            messagingTemplate.convertAndSend("/topic/requests", updated);
            return ResponseEntity.ok(updated);
        })
        .orElseGet(ResponseEntity.notFound()::build);
}
    @PutMapping("/{id}/admin")
    public ResponseEntity<ServiceRequest> updateRequestAdmin(
            @PathVariable String id,
            @RequestBody ServiceRequest updated,
            Authentication auth) {

        if (!isAdmin(auth)) {
            logger.warn("Non-admin attempted admin update on request {}", id);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        logger.info("Admin updating request: {}", id);

        return repository.findById(id)
                .<ResponseEntity<ServiceRequest>>map(existing -> {
                    if (updated.status != null) {
                        if (!"PENDING".equals(existing.status) &&
                                !"APPROVED".equals(updated.status) &&
                                !"REJECTED".equals(updated.status)) {
                            return ResponseEntity.badRequest().build();
                        }
                        existing.status = updated.status;
                    }
                    if (updated.lat != null)
                        existing.lat = updated.lat;
                    if (updated.lng != null)
                        existing.lng = updated.lng;
                    if (updated.comments != null)
                        existing.comments = updated.comments;

                    ServiceRequest saved = repository.save(existing);
                    messagingTemplate.convertAndSend("/topic/requests", saved);

                    logger.info("Admin update success: Request {} status now {}", id, saved.status);
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(ResponseEntity.notFound()::build);
    }

    @PutMapping("/{id}/owner")
    public ResponseEntity<ServiceRequest> updateRequestOwner(
            @PathVariable String id,
            @RequestBody ServiceRequest updated,
            Authentication auth) {

        String currentUserId = extractUserId(auth);
        logger.info("Owner {} updating request: {}", currentUserId, id);

        return repository.findById(id)
                .<ResponseEntity<ServiceRequest>>map(existing -> {
                    if (!existing.ownerId.equals(currentUserId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }
                    if (!"PENDING".equals(existing.status)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }

                    if (updated.name != null)
                        existing.name = updated.name;
                    if (updated.description != null)
                        existing.description = updated.description;
                    if (updated.category != null)
                        existing.category = updated.category;
                    if (updated.address != null)
                        existing.address = updated.address;

                    ServiceRequest saved = repository.save(existing);
                    messagingTemplate.convertAndSend("/topic/requests", saved);

                    logger.info("Owner update success: Request {}", id);
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(ResponseEntity.notFound()::build);
    }

    @PostMapping("/{id}/documents")
    public ResponseEntity<ServiceRequest> uploadAdditionalDocuments(
            @PathVariable String id,
            @RequestParam("documents") MultipartFile[] files,
            Authentication auth) {

        String currentUserId = extractUserId(auth);
        logger.info("Owner {} uploading additional documents for request {}", currentUserId, id);

        if (files == null || files.length == 0) {
            return ResponseEntity.badRequest().build();
        }

        return repository.findById(id)
                .<ResponseEntity<ServiceRequest>>map(existing -> {
                    if (!existing.ownerId.equals(currentUserId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }
                    if ("APPROVED".equals(existing.status)) {
                        return ResponseEntity.badRequest().build();
                    }

                    Path requestDir = Paths.get("./uploads/requests/" + id);
                    try {
                        Files.createDirectories(requestDir);
                        for (MultipartFile file : files) {
                            if (file.isEmpty())
                                continue;

                            String originalName = file.getOriginalFilename();
                            String fileName = UUID.randomUUID() +
                                    (originalName != null ? "_" + originalName.replaceAll("[^a-zA-Z0-9.-]", "_") : "");
                            Path filePath = requestDir.resolve(fileName);
                            file.transferTo(filePath);

                            existing.documents.add(filePath.toString());
                        }
                        ServiceRequest updated = repository.save(existing);
                        messagingTemplate.convertAndSend("/topic/requests", updated);

                        logger.info("Documents uploaded successfully for request {}", id);
                        return ResponseEntity.ok(updated);
                    } catch (IOException e) {
                        logger.error("Upload failed: {}", e.getMessage());
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
                    }
                })
                .orElseGet(ResponseEntity.notFound()::build);
    }

    @GetMapping("/{id}/documents/{index}")
    public ResponseEntity<InputStreamResource> getDocument(
            @PathVariable String id,
            @PathVariable int index,
            Authentication auth) {

        logger.info("Downloading document {} for request {}", index, id);

        if (auth == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String currentUserId = extractUserId(auth);
        boolean isAdmin = isAdmin(auth);

        return repository.findById(id)
                .<ResponseEntity<InputStreamResource>>map(existing -> {
                    if (!existing.ownerId.equals(currentUserId) && !isAdmin) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }

                    if (index < 0 || index >= existing.documents.size()) {
                        return ResponseEntity.notFound().build();
                    }

                    String docPath = existing.documents.get(index);
                    Path path = Paths.get(docPath);

                    try {
                        InputStream inputStream = Files.newInputStream(path);
                        return ResponseEntity.ok()
                                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                                .header(HttpHeaders.CONTENT_DISPOSITION,
                                        "attachment; filename=\"" + path.getFileName() + "\"")
                                .body(new InputStreamResource(inputStream));
                    } catch (IOException e) {
                        logger.error("File read failed: {}", e.getMessage());
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
                    }
                })
                .orElseGet(ResponseEntity.notFound()::build);
    }

    @DeleteMapping("/{id}/documents/{index}")
    public ResponseEntity<ServiceRequest> deleteDocument(
            @PathVariable String id,
            @PathVariable int index,
            Authentication auth) {

        String currentUserId = extractUserId(auth);
        boolean isAdmin = isAdmin(auth);

        logger.info("Deleting document {} for request {} by {}", index, id,
                isAdmin ? "admin" : "owner " + currentUserId);

        return repository.findById(id)
                .<ResponseEntity<ServiceRequest>>map(existing -> {
                    if (!existing.ownerId.equals(currentUserId) && !isAdmin) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }

                    if (index < 0 || index >= existing.documents.size()) {
                        return ResponseEntity.notFound().build();
                    }

                    String docPath = existing.documents.remove(index);
                    try {
                        Files.deleteIfExists(Paths.get(docPath));
                        logger.info("File deleted: {}", docPath);
                    } catch (IOException e) {
                        logger.warn("Failed to delete file {}: {}", docPath, e.getMessage());
                    }

                    ServiceRequest updated = repository.save(existing);
                    messagingTemplate.convertAndSend("/topic/requests", updated);

                    return ResponseEntity.ok(updated);
                })
                .orElseGet(ResponseEntity.notFound()::build);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        String currentUserId = extractUserId(auth);

        logger.info("Owner {} attempting to delete request {}", currentUserId, id);

        return repository.findById(id)
                .<ResponseEntity<Void>>map(existing -> {
                    if (!existing.ownerId.equals(currentUserId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }
                    if ("APPROVED".equals(existing.status)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }

                    existing.status = "DELETED";
                    messagingTemplate.convertAndSend("/topic/requests", existing);
                    repository.delete(existing);

                    logger.info("Request {} deleted by owner {}", id, currentUserId);
                    return ResponseEntity.noContent().build();
                })
                .orElseGet(ResponseEntity.notFound()::build);
    }

    // ────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────

    private String extractUserId(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            throw new IllegalStateException("No authenticated user found");
        }
        return ((User) auth.getPrincipal()).id;
    }

    private boolean isAdmin(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return false;
        }
        User user = (User) auth.getPrincipal();
        return "ADMIN".equals(user.role.name());
    }
}