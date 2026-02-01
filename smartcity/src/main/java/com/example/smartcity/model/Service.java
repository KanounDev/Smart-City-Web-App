// src/main/java/com/example/smartcity/model/Service.java
package com.example.smartcity.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "services")
public class Service {
    @Id
    public String id;

    public String businessId;  // References approved ServiceRequest.id
    public String ownerId;     // For ownership validation
    public String name;
    public String description;
    public String price;       // e.g., "89 TND"

    // Optional: timestamps, etc.
}