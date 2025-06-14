// App.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';

// Constants
const GEMINI_API_KEY = 'AIzaSyCRAzRDm37YRwJgO2xJcGv1jfYtmTcTfEw';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const temperature = 0.7;

// System instruction
const systemInstruction = `You are a cardiologist AI expert. Your role is to:
- Ask 6 follow-up questions to understand user symptoms related to cardiovascular disease, one at a time, based on previous answers.
- Based on answers, recommend first-line medical care (like medications or lifestyle advice).
- Suggest necessary diagnostic tests (e.g., ECG, echocardiogram) where applicable.
- If symptoms suggest emergency (like crushing chest pain, syncope, severe shortness of breath), advise urgent cardiologist consultation.
- After the questions and recommendation, summarize the session.
- Then, ask the user if they want to speak to a cardiologist on the platform.
Please act like a compassionate, experienced medical doctor.`; // truncated for brevity

// Types
type Message = {
  sender: 'user' | 'ai';
  text: string;
};

type Conversation = {
  id: number;
  title: string;
  messages: Message[];
};

export default function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number>(1);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const maxQuestions = 6;

  const activeConversation = conversations.find(c => c.id === activeConvId);

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('conversations');
      if (saved) {
        setConversations(JSON.parse(saved));
      } else {
        setConversations([{ id: 1, title: 'New Conversation', messages: [] }]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('conversations', JSON.stringify(conversations));
  }, [conversations]);

  const updateMessages = (convId: number, messages: Message[]) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === convId
          ? {
              ...c,
              messages,
              title:
                c.title === 'New Conversation'
                  ? messages.find(m => m.sender === 'user')?.text.slice(0, 30) || 'New Conversation'
                  : c.title
            }
          : c
      )
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConversation) return;

    const updatedMessages: Message[] = [...activeConversation.messages, { sender: 'user', text: input }];
    updateMessages(activeConvId, updatedMessages);
    setInput('');
    setLoading(true);

    const chatHistory = [
      { role: 'user', parts: [{ text: systemInstruction }] },
      ...updatedMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }))
    ];

    const payload = {
      contents: chatHistory,
      generationConfig: { temperature, maxOutputTokens: 800, topP: 0.8, topK: 10 },
      safetySettings: [{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }]
    };

    try {
      const res = await fetch(
        `${GEMINI_BASE_URL}/${DEFAULT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';

      updateMessages(activeConvId, [...updatedMessages, { sender: 'ai', text: reply }]);

      if (questionCount < maxQuestions) {
        setQuestionCount(prev => prev + 1);
      }
    } catch (err) {
      updateMessages(activeConvId, [...updatedMessages, { sender: 'ai', text: 'Error occurred.' }]);
    }

    setLoading(false);
  };

  const createNewConv = () => {
    const newId = conversations.length ? Math.max(...conversations.map(c => c.id)) + 1 : 1;
    const newConv: Conversation = { id: newId, title: 'New Conversation', messages: [] };
    setConversations([...conversations, newConv]);
    setActiveConvId(newId);
    setQuestionCount(0);
  };

  const deleteConv = (id: number) => {
    Alert.alert('Delete Conversation', 'Are you sure?', [
      {
        text: 'Yes',
        onPress: () => {
          const updated = conversations.filter(c => c.id !== id);
          setConversations(updated);
          if (activeConvId === id && updated.length) {
            setActiveConvId(updated[0].id);
          }
        }
      },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <Text style={styles.header}>Conversations</Text>
        <ScrollView>
          {conversations.map((c: Conversation) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.convItem, c.id === activeConvId && styles.activeConv]}
              onPress={() => setActiveConvId(c.id)}
              onLongPress={() => deleteConv(c.id)}
            >
              <Text numberOfLines={1}>{c.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={createNewConv} style={styles.newBtn}>
          <Text style={{ color: 'white' }}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <View style={styles.chatContainer}>
        <ScrollView contentContainerStyle={{ padding: 10 }}>
          {activeConversation?.messages.map((m: Message, i: number) => (
            <View key={i} style={m.sender === 'user' ? styles.userMsg : styles.aiMsg}>
              <Markdown>{m.text}</Markdown>
            </View>
          ))}
        </ScrollView>
        {/* Input */}
        <View style={styles.inputArea}>
          <TextInput
            multiline
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            style={styles.input}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: 'white' }}>Send</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 120,
    backgroundColor: '#eee',
    padding: 10
  },
  header: {
    fontWeight: 'bold',
    marginBottom: 10
  },
  convItem: {
    padding: 6,
    marginVertical: 4,
    backgroundColor: '#ddd',
    borderRadius: 5
  },
  activeConv: {
    backgroundColor: '#bbb'
  },
  newBtn: {
    marginTop: 10,
    backgroundColor: '#0078d4',
    padding: 8,
    alignItems: 'center',
    borderRadius: 5
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  },
  userMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#0078d4',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
    maxWidth: '80%'
  },
  aiMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e5ea',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
    maxWidth: '80%'
  },
  inputArea: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ccc'
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: '#0078d4',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 5
  }
});
