package com.example.smartcity.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.ArrayList;

@Document(collection = "issues")
public class Issue {
    @Id
    public String id;
    public String title;
    public String description;
    public String category;
    public Double lat;
    public Double lng;
    public String status = "PENDING";  // PENDING, APPROVED, REJECTED
    public String reporterId;
    public String municipality;
    public String comments;            // for admin moderation
    public List<String> photos = new ArrayList<>();
}