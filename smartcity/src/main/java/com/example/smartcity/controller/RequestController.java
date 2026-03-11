package com.example.smartcity.controller;

import com.example.smartcity.model.ServiceRequest;
import com.example.smartcity.model.User;
import com.example.smartcity.repository.RequestRepository;
import com.example.smartcity.repository.UserRepository;
import com.example.smartcity.service.NotificationService;

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

import org.springframework.beans.factory.annotation.Autowired;
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

    @Autowired
    private NotificationService notificationService;

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
        @RequestParam("name") String name,
        @RequestParam("description") String description,
        @RequestParam("category") String category,
        @RequestParam("address") String address,
        @RequestParam("municipality") String municipality,   // you can add this too
        @RequestParam("latitude") Double latitude,
        @RequestParam("longitude") Double longitude,
        @RequestParam(value = "documents", required = false) MultipartFile[] files,
        Authentication auth) {

    logger.info("New request submission from user: {}", extractUserId(auth));

    ServiceRequest request = new ServiceRequest();
    request.name = name;
    request.description = description;
    request.category = category;
    request.address = address;

    request.lat = latitude;
    request.lng = longitude;

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
                        + (originalName != null
                        ? "_" + originalName.replaceAll("[^a-zA-Z0-9.-]", "_")
                        : "");

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

        // 1. SECURITY: Is this actually an Admin?
        if (!isAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        User admin = (User) auth.getPrincipal();
        logger.info("Admin {} updating request {}", admin.id, id);

        return repository.findById(id)
                .<ResponseEntity<ServiceRequest>>map(request -> {

                    // 2. MUNICIPALITY CHECK: Does the admin manage this city?
                    if (!admin.municipality.equals(request.municipality)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }

                    // 3. APPLY UPDATES: Map payload keys to the Request object
                    if (payload.containsKey("status")) {
                        request.status = (String) payload.get("status").toString().toUpperCase();
                    }
                    if (payload.containsKey("comments")) {
                        request.comments = (String) payload.get("comments");
                    }
                    if (payload.containsKey("lat")) {
                        Object latVal = payload.get("lat");
                        request.lat = (latVal != null && latVal instanceof Number) ? ((Number) latVal).doubleValue()
                                : null;
                    }
                    if (payload.containsKey("lng")) {
                        Object lngVal = payload.get("lng");
                        request.lng = (lngVal != null && lngVal instanceof Number) ? ((Number) lngVal).doubleValue()
                                : null;
                    }

                    // 4. SAVE & BROADCAST: Update DB and notify the Frontend
                    ServiceRequest updated = repository.save(request);

                    // Send real-time UI update
                    messagingTemplate.convertAndSend("/topic/requests", updated);

                    // 5. NOTIFICATIONS: Trigger specific alerts
                    if ("APPROVED".equals(updated.status)) {
                        notificationService.createStatusChangeNotification(updated); // Notify the Owner
                        notificationService.createNewBusinessNotification(updated); // Notify Citizens nearby
                    } else if ("REJECTED".equals(updated.status)) {
                        notificationService.createStatusChangeNotification(updated); // Notify only the Owner
                    }

                    return ResponseEntity.ok(updated);
                })
                .orElseGet(ResponseEntity.notFound()::build);
    }

    @PutMapping("/{id}")
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

    // ────────────────────────────────────────────────
    // Additional Documents (Owner only)
    // ────────────────────────────────────────────────

    /**
     * Owner can upload more documents to their PENDING request
     */
    @PostMapping(value = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ServiceRequest> addDocuments(
            @PathVariable String id,
            @RequestPart("documents") MultipartFile[] files,
            Authentication auth) {

        String currentUserId = extractUserId(auth);
        logger.info("Owner {} uploading additional documents to request {}", currentUserId, id);

        return repository.findById(id)
                .<ResponseEntity<ServiceRequest>>map(request -> {
                    // Security checks
                    if (!request.ownerId.equals(currentUserId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }
                    if (!"PENDING".equals(request.status)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(null); // Only pending requests can receive more documents
                    }

                    if (files == null || files.length == 0) {
                        return ResponseEntity.badRequest().build();
                    }

                    Path requestDir = Paths.get("./uploads/requests/" + id);
                    try {
                        Files.createDirectories(requestDir);

                        for (MultipartFile file : files) {
                            if (file.isEmpty())
                                continue;

                            String originalName = file.getOriginalFilename();
                            String fileName = UUID.randomUUID()
                                    + (originalName != null ? "_" + originalName.replaceAll("[^a-zA-Z0-9.-]", "_")
                                            : "");

                            Path filePath = requestDir.resolve(fileName);
                            file.transferTo(filePath);

                            request.documents.add(filePath.toString());
                        }

                        ServiceRequest saved = repository.save(request);
                        messagingTemplate.convertAndSend("/topic/requests", saved);

                        logger.info("Added {} additional document(s) to request {}", files.length, id);
                        return ResponseEntity.ok(saved);

                    } catch (IOException e) {
                        logger.error("Additional file upload failed for request {}: {}", id, e.getMessage());
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
                    }
                })
                .orElseGet(ResponseEntity.notFound()::build);
    }

    /**
     * Owner can delete one of their documents from a PENDING request
     */
    @DeleteMapping("/{id}/documents/{index}")
    public ResponseEntity<ServiceRequest> deleteDocument(
            @PathVariable String id,
            @PathVariable int index,
            Authentication auth) {

        String currentUserId = extractUserId(auth);
        logger.info("Owner {} attempting to delete document index {} from request {}", currentUserId, index, id);

        return repository.findById(id)
                .<ResponseEntity<ServiceRequest>>map(request -> {
                    if (!request.ownerId.equals(currentUserId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }
                    if (!"PENDING".equals(request.status)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }
                    if (index < 0 || index >= request.documents.size()) {
                        return ResponseEntity.notFound().build();
                    }

                    // Delete file from disk
                    String docPath = request.documents.get(index);
                    try {
                        Files.deleteIfExists(Paths.get(docPath));
                    } catch (IOException e) {
                        logger.warn("Could not delete physical file: {}", docPath);
                    }

                    request.documents.remove(index);
                    ServiceRequest saved = repository.save(request);

                    messagingTemplate.convertAndSend("/topic/requests", saved);
                    logger.info("Document index {} deleted from request {}", index, id);

                    return ResponseEntity.ok(saved);
                })
                .orElseGet(ResponseEntity.notFound()::build);
    }

    @GetMapping("/{id}/documents/{index}")
public ResponseEntity<InputStreamResource> getDocument(
        @PathVariable String id,
        @PathVariable int index,
        Authentication auth) {

    logger.info("Opening document {} for request {}", index, id);

    if (auth == null) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    String currentUserId = extractUserId(auth);
    boolean isAdminUser = isAdmin(auth);

    return repository.findById(id)
            .<ResponseEntity<InputStreamResource>>map(existing -> {
                if (!existing.ownerId.equals(currentUserId) && !isAdminUser) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }

                if (index < 0 || index >= existing.documents.size()) {
                    return ResponseEntity.notFound().build();
                }

                String docPath = existing.documents.get(index);
                Path path = Paths.get(docPath);

                try {
                    InputStream inputStream = Files.newInputStream(path);
                    String filename = path.getFileName().toString();

                    // 🔥 NEW: Proper MIME type + INLINE for preview
                    String contentType = getContentType(filename);

                    return ResponseEntity.ok()
                            .contentType(MediaType.parseMediaType(contentType))
                            .header(HttpHeaders.CONTENT_DISPOSITION,
                                    "inline; filename=\"" + filename + "\"")   // ← CHANGED FROM "attachment"
                            .body(new InputStreamResource(inputStream));

                } catch (IOException e) {
                    logger.error("File read failed: {}", e.getMessage());
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
                }
            })
            .orElseGet(ResponseEntity.notFound()::build);
}

// Add this small helper at the bottom of the class (anywhere)
private String getContentType(String filename) {
    String ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    return switch (ext) {
        case ".pdf"  -> "application/pdf";
        case ".jpg", ".jpeg" -> "image/jpeg";
        case ".png"  -> "image/png";
        case ".gif"  -> "image/gif";
        case ".txt"  -> "text/plain";
        case ".doc", ".docx" -> "application/msword";
        default      -> "application/octet-stream";
    };
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