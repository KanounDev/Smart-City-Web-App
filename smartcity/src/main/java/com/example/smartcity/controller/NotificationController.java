package com.example.smartcity.controller;

import com.example.smartcity.model.Notification;
import com.example.smartcity.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    @GetMapping("/my")
    public List<Notification> getMyNotifications(Authentication auth) {
        String userId = ((com.example.smartcity.model.User) auth.getPrincipal()).id;

        List<Notification> personal = repository.findByUserId(userId);
        List<Notification> broadcast = repository.findByUserIdIsNullAndType(
                Notification.NotificationType.NEW_BUSINESS_APPROVED);

        return Stream.concat(personal.stream(), broadcast.stream())
                .collect(Collectors.toList());
    }

    /**
     * Mark one notification as read for the current user
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable String id,
            Authentication auth) {

        String userId = ((com.example.smartcity.model.User) auth.getPrincipal()).id;

        return repository.findById(id)
                .map(notification -> {
                    // Security: personal notifications can only be marked by their owner
                    if (notification.userId != null && !notification.userId.equals(userId)) {
                        return new ResponseEntity<Void>(HttpStatus.FORBIDDEN);
                    }

                    notification.readBy.add(userId);
                    repository.save(notification);
                    return new ResponseEntity<Void>(HttpStatus.OK);
                })
                .orElse(new ResponseEntity<Void>(HttpStatus.NOT_FOUND));
    }

    /**
     * Mark all visible notifications as read (great UX)
     */
    @PutMapping("/mark-all-read")
    public ResponseEntity<Void> markAllAsRead(Authentication auth) {
        String userId = ((com.example.smartcity.model.User) auth.getPrincipal()).id;

        List<Notification> notifications = getMyNotifications(auth);

        for (Notification n : notifications) {
            n.readBy.add(userId);
        }

        repository.saveAll(notifications);
        return ResponseEntity.ok().build();
    }
}