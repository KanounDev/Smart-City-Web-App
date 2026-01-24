package com.example.smartcity.controller;

import com.example.smartcity.model.ServiceRequest;
import com.example.smartcity.repository.RequestRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate; // Import this
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import java.util.List;

@RestController
@RequestMapping("/api/requests")
@CrossOrigin(origins = "http://localhost:4200")
public class RequestController {
    private final RequestRepository repository;
    private final SimpMessagingTemplate messagingTemplate; // Inject Template

    // Update constructor to include messagingTemplate
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
        String ownerId = ((com.example.smartcity.model.User) auth.getPrincipal()).id;

        // ADD THIS LOG
        System.out.println("Fetching requests for Owner ID: " + ownerId);

        return repository.findByOwnerId(ownerId);
    }

    @PostMapping
    public ServiceRequest submitRequest(@RequestBody ServiceRequest request, Authentication auth) {
        request.ownerId = ((com.example.smartcity.model.User) auth.getPrincipal()).id;
        return repository.save(request);
    }

    @GetMapping("/admin/pending")
    public List<ServiceRequest> getPending() {
        return repository.findByStatus("PENDING");
    }

    // ... existing imports

    // Admin Update (Approve/Reject)
    @PutMapping("/admin/{id}")
    public ServiceRequest updateRequest(@PathVariable String id, @RequestBody ServiceRequest updated) {
        ServiceRequest existing = repository.findById(id).orElseThrow();

        // Update fields
        existing.status = updated.status;
        existing.comments = updated.comments;
        existing.lat = updated.lat;
        existing.lng = updated.lng;

        ServiceRequest saved = repository.save(existing);

        // --- NEW LINE: Broadcast the change so the Owner sees it instantly ---
        messagingTemplate.convertAndSend("/topic/requests", saved);
        // --------------------------------------------------------------------

        return saved;
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceRequest> updateRequest(
            @PathVariable String id,
            @RequestBody ServiceRequest updated,
            Authentication auth) {

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