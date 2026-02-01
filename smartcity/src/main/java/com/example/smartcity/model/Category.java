// Category.java
package com.example.smartcity.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "categories")
public class Category {
    @Id
    public String id;
    public String name;  // e.g., "Shop", "Service", "Restaurant"

    // Optional: Add constructors, getters/setters if needed
}