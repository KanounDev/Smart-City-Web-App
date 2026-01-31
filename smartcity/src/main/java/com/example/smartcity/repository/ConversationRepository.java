package com.example.smartcity.repository;

import com.example.smartcity.model.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ConversationRepository extends MongoRepository<Conversation, String> {
}