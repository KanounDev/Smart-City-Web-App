package com.example.smartcity.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "requests")
public class ServiceRequest {
    @Id
    public String id;
    public String name;
    public String description;
    public String category;  // e.g., "Shop", "Service"
    public String address;   // Text location
    public Double lat;       // Set by admin
    public Double lng;       // Set by admin
    public String status = "PENDING";  // PENDING, APPROVED, REJECTED
    public String ownerId;
    public String comments;  // For admin/owner communication
}