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

    // 🔥 UPDATED: Matches sample project 99%
    public void createStatusChangeNotification(ServiceRequest request) {
        Notification notif = new Notification();
        notif.userId = request.ownerId;
        notif.type = Notification.NotificationType.REQUEST_STATUS_CHANGED;
        notif.title = "Request Status Updated";
        notif.message = "Your request '" + request.name + "' has been " + request.status.toLowerCase() + ".";
        notif.relatedId = request.id;
        notif.relatedType = "ServiceRequest";
        notif.municipality = request.municipality;

        notificationRepository.save(notif);

        // Exact same push as in the sample project
        messagingTemplate.convertAndSend("/topic/notifications/" + notif.userId, notif);
    }

    // Broadcast stays unchanged (already perfect)
    public void createNewBusinessNotification(ServiceRequest request) {
        if (!"APPROVED".equals(request.status))
            return;

        Notification notif = new Notification();
        notif.userId = null;
        notif.type = Notification.NotificationType.NEW_BUSINESS_APPROVED;
        notif.title = "New Business Approved";
        notif.message = "A new " + request.category.toLowerCase() + " '" + request.name
                + "' has been approved in your area.";
        notif.relatedId = request.id;
        notif.relatedType = "ServiceRequest";
        notif.municipality = request.municipality;
        notif.lat = request.lat;
        notif.lng = request.lng;

        notificationRepository.save(notif);
        messagingTemplate.convertAndSend("/topic/new-business", notif);
    }

    // Add this method to the existing NotificationService class
    // Updated method - works for both directions
    public void createNewMessageNotification(String recipientUserId, String senderName, String messagePreview) {
        Notification notif = new Notification();
        notif.userId = recipientUserId;
        notif.type = Notification.NotificationType.NEW_MESSAGE;
        notif.title = "New Message";

        // More natural text depending on who receives it
        notif.message = "New message from " + senderName + ": " + messagePreview;

        notif.relatedId = recipientUserId; // conversation ID = ownerId
        notif.relatedType = "Conversation";
        notif.municipality = null;

        notificationRepository.save(notif);

        // 🔥 Same push as the original sample project
        messagingTemplate.convertAndSend("/topic/notifications/" + recipientUserId, notif);
    }

    // NEW: Review notification for owner (matches the exact style of the sample
    // project)
    public void createReviewAddedNotification(String ownerId, String businessName) {
        Notification notif = new Notification();
        notif.userId = ownerId;
        notif.type = Notification.NotificationType.REVIEW_ADDED;
        notif.title = "New Review Added";
        notif.message = "A new review was added for " + businessName;
        notif.relatedId = null; // we can link to businessId later if you want
        notif.relatedType = "Review";
        notif.municipality = null;

        notificationRepository.save(notif);

        // 🔥 Exact same real-time push as the original sample project
        messagingTemplate.convertAndSend("/topic/notifications/" + ownerId, notif);
    }
}