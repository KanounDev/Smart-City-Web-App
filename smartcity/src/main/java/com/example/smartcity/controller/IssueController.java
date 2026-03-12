package com.example.smartcity.controller;

import com.example.smartcity.model.Issue;
import com.example.smartcity.model.User;
import com.example.smartcity.repository.IssueRepository;
import com.example.smartcity.repository.NotificationRepository;
import com.example.smartcity.service.NotificationService;
import com.example.smartcity.model.Notification;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.InputStreamResource; // ← THIS WAS MISSING
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/issues")
@CrossOrigin(origins = "http://localhost:4200")
public class IssueController {

    private static final Logger logger = LoggerFactory.getLogger(IssueController.class);

    private final IssueRepository repository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;

    public IssueController(IssueRepository repository, NotificationRepository notificationRepository, NotificationService notificationService) {
        this.repository = repository;
        this.notificationRepository = notificationRepository;
        this.notificationService = notificationService;
    }

    // ────────────────────────────────────────────────
    // CREATE (used by ReportIssueComponent)
    // ────────────────────────────────────────────────
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Issue> createIssue(
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam("category") String category,
            @RequestParam("municipality") String municipality,
            @RequestParam("lat") Double lat,
            @RequestParam("lng") Double lng,
            @RequestParam(value = "photos", required = false) MultipartFile[] photos,
            Authentication auth) {

        logger.info("New issue reported by user: {}", extractUserId(auth));

        Issue issue = new Issue();
        issue.title = title;
        issue.description = description;
        issue.category = category;
        issue.municipality = municipality;
        issue.lat = lat;
        issue.lng = lng;
        issue.reporterId = extractUserId(auth);

        Issue saved = repository.save(issue);
        notificationService.createNewIssueNotification(saved);
        if (photos != null && photos.length > 0) {
            Path issueDir = Paths.get("./uploads/issues/" + saved.id);
            try {
                Files.createDirectories(issueDir);

                for (MultipartFile file : photos) {
                    if (file.isEmpty())
                        continue;

                    String originalName = file.getOriginalFilename();
                    String fileName = UUID.randomUUID()
                            + (originalName != null ? "_" + originalName.replaceAll("[^a-zA-Z0-9.-]", "_") : "");

                    Path filePath = issueDir.resolve(fileName);
                    file.transferTo(filePath);

                    saved.photos.add(filePath.toString());
                }
                saved = repository.save(saved);
            } catch (IOException e) {
                logger.error("Photo upload failed: {}", e.getMessage());
                repository.delete(saved);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }
        }

        logger.info("Issue created successfully: ID {}", saved.id);
        return ResponseEntity.ok(saved);
    }

    // ────────────────────────────────────────────────
    // GET endpoints
    // ────────────────────────────────────────────────
    @GetMapping("/my")
    public List<Issue> getMyIssues(Authentication auth) {
        String reporterId = extractUserId(auth);
        logger.info("Fetching issues for reporter: {}", reporterId);
        return repository.findByReporterId(reporterId);
    }

    @GetMapping("/pending")
    public List<Issue> getPending(Authentication auth) {
        User admin = (User) auth.getPrincipal();
        String municipality = admin.municipality;
        logger.info("Fetching pending issues for municipality: {}", municipality);
        return repository.findByStatusAndMunicipality("PENDING", municipality);
    }

    @GetMapping("/approved/public")
    public List<Issue> getApprovedPublic() {
        logger.info("Public request for approved issues");
        return repository.findByStatus("APPROVED");
    }

    // ────────────────────────────────────────────────
    // ADMIN UPDATE
    // ────────────────────────────────────────────────
    @PutMapping("/admin/{id}")
    public ResponseEntity<Issue> updateAdmin(@PathVariable String id,
            @RequestBody Map<String, Object> payload,
            Authentication auth) {

        if (!isAdmin(auth)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        User admin = (User) auth.getPrincipal();
        logger.info("Admin {} updating issue {}", admin.id, id);

        return repository.findById(id)
                .<ResponseEntity<Issue>>map(issue -> {
                    if (!admin.municipality.equals(issue.municipality)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }

                    if (payload.containsKey("status")) {
                        issue.status = ((String) payload.get("status")).toUpperCase();

                    }
                    if (payload.containsKey("comments")) {
                        issue.comments = (String) payload.get("comments");
                    }
                    if (payload.containsKey("lat")) {
                        Object latVal = payload.get("lat");
                        issue.lat = (latVal != null && latVal instanceof Number) ? ((Number) latVal).doubleValue()
                                : null;
                    }
                    if (payload.containsKey("lng")) {
                        Object lngVal = payload.get("lng");
                        issue.lng = (lngVal != null && lngVal instanceof Number) ? ((Number) lngVal).doubleValue()
                                : null;
                    }

                    Issue updated = repository.save(issue);
                    if (payload.containsKey("status")) {
                        notificationService.createIssueStatusChangedNotification(updated);
                    }
                    return ResponseEntity.ok(updated);
                })
                .orElseGet(ResponseEntity.notFound()::build);
    }

    // ────────────────────────────────────────────────
    // PHOTO SERVING
    // ────────────────────────────────────────────────
    @GetMapping("/admin")
    public List<Issue> getAdminIssues(
            @RequestParam(required = false) String status,
            Authentication auth) {

        User admin = (User) auth.getPrincipal();
        String municipality = admin.municipality;

        if (status == null || status.trim().isEmpty()) {
            return repository.findByMunicipality(municipality); // All statuses
        }
        return repository.findByStatusAndMunicipality(status.toUpperCase(), municipality);
    }

    @GetMapping("/{id}/photos/{index}")
    public ResponseEntity<InputStreamResource> getPhoto(
            @PathVariable String id,
            @PathVariable int index) {

        logger.info("Serving photo {} for issue {}", index, id);

        return repository.findById(id)
                .<ResponseEntity<InputStreamResource>>map(issue -> {
                    if (index < 0 || index >= issue.photos.size()) {
                        return ResponseEntity.notFound().build();
                    }

                    String photoPath = issue.photos.get(index);
                    Path path = Paths.get(photoPath);

                    try {
                        InputStream inputStream = Files.newInputStream(path);
                        String filename = path.getFileName().toString();

                        String contentType = getContentType(filename);

                        return ResponseEntity.ok()
                                .contentType(MediaType.parseMediaType(contentType))
                                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                                .body(new InputStreamResource(inputStream));

                    } catch (IOException e) {
                        logger.error("Photo read failed: {}", e.getMessage());
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
                    }
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

    private void sendIssueNotification(Issue issue, String typeStr, String title, String message) {
    if (issue.reporterId == null) return;

    Notification notif = new Notification();
    notif.userId = issue.reporterId;
    notif.type = Notification.NotificationType.valueOf(typeStr);
    notif.title = title;
    notif.message = message;
    notif.createdAt = LocalDateTime.now();
    notif.readBy = new java.util.HashSet<String>();   // ← HashSet instead of ArrayList
    notificationRepository.save(notif);
}

    private boolean isAdmin(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return false;
        }
        User user = (User) auth.getPrincipal();
        return "ADMIN".equals(user.role.name());
    }

    private String getContentType(String filename) {
        String ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        return switch (ext) {
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".png" -> "image/png";
            case ".gif" -> "image/gif";
            case ".webp" -> "image/webp";
            default -> "application/octet-stream";
        };
    }
}