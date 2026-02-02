// src/main/java/com/example/smartcity/repository/NotificationRepository.java
package com.example.smartcity.repository;

import com.example.smartcity.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByUserId(String userId);  // For personal notifications
    List<Notification> findByUserIdIsNullAndType(Notification.NotificationType type);  // For broadcast (e.g., NEW_BUSINESS_APPROVED)
}