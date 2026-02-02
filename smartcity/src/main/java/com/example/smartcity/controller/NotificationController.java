// src/main/java/com/example/smartcity/controller/NotificationController.java
package com.example.smartcity.controller;

import com.example.smartcity.model.Notification;
import com.example.smartcity.repository.NotificationRepository;
import com.example.smartcity.model.Notification.NotificationType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:4200")
public class NotificationController {

    @Autowired
    private NotificationRepository repository;

    // Get all relevant notifications for the current user: personal + broadcast
    @GetMapping("/my")
    public List<Notification> getMyNotifications(Authentication auth) {
        String userId = ((com.example.smartcity.model.User) auth.getPrincipal()).id;

        // Personal notifications
        List<Notification> personal = repository.findByUserId(userId);

        // Broadcast notifications (e.g., NEW_BUSINESS_APPROVED)
        List<Notification> broadcast = repository.findByUserIdIsNullAndType(NotificationType.NEW_BUSINESS_APPROVED);

        // Combine and return (frontend will filter broadcast by distance)
        return Stream.concat(personal.stream(), broadcast.stream())
                     .collect(Collectors.toList());
    }

    // Mark as read (for personal only)
    @PutMapping("/{id}/read")
    public Notification markAsRead(@PathVariable String id) {
        return repository.findById(id).map(notif -> {
            notif.isRead = true;
            return repository.save(notif);
        }).orElse(null);
    }
}