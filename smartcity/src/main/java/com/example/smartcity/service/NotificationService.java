// src/main/java/com/example/smartcity/service/NotificationService.java
package com.example.smartcity.service;

import com.example.smartcity.model.Notification;
import com.example.smartcity.model.ServiceRequest;
import com.example.smartcity.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Create personal notification for owner on status change (approve/reject)
    public void createStatusChangeNotification(ServiceRequest request) {
        Notification notif = new Notification();
        notif.userId = request.ownerId;
        notif.type = Notification.NotificationType.REQUEST_STATUS_CHANGED;
        notif.title = "Request Status Updated";
        notif.message = "Your request '" + request.name + "' has been " + request.status.toLowerCase() + ".";
        notif.relatedId = request.id;
        notif.relatedType = "ServiceRequest";
        notif.municipality = request.municipality;
        // No lat/lng for personal status change
        notificationRepository.save(notif);

        // Broadcast to owner's personal topic
        messagingTemplate.convertAndSendToUser(notif.userId, "/notifications", notif);
    }

    // Create broadcast notification for citizens on approval
    public void createNewBusinessNotification(ServiceRequest request) {
        if (!"APPROVED".equals(request.status)) {
            return;  // Only for approvals
        }

        Notification notif = new Notification();
        notif.userId = null;  // Broadcast: no specific user
        notif.type = Notification.NotificationType.NEW_BUSINESS_APPROVED;
        notif.title = "New Business Approved";
        notif.message = "A new " + request.category.toLowerCase() + " '" + request.name + "' has been approved in your area.";
        notif.relatedId = request.id;
        notif.relatedType = "ServiceRequest";
        notif.municipality = request.municipality;
        notif.lat = request.lat;  // From admin-set location
        notif.lng = request.lng;  // From admin-set location
        notificationRepository.save(notif);

        // Broadcast to public topic for area notifications
        messagingTemplate.convertAndSend("/topic/new-business", notif);
    }
}