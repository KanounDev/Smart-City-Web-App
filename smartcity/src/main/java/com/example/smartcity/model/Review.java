// src/main/java/com/example/smartcity/model/Review.java
package com.example.smartcity.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "reviews")
public class Review {
    @Id
    public String id;

    public String businessId;  // References approved ServiceRequest.id
    public String userId;      // Or username
    public String comment;
    public int rating;         // 1-5
    public LocalDateTime date = LocalDateTime.now();
}