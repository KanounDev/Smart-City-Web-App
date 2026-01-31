package com.example.smartcity.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "conversations")
public class Conversation {
    @Id
    public String id;  // Set to ownerId
    public String ownerId;
    public List<Message> messages = new ArrayList<>();
}