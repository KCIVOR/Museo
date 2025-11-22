import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CommentModal({
  commentModalVisible,
  setCommentModalVisible,
  currentPostComments,
  newCommentText,
  setNewCommentText,
  postComment,
  renderComment,
  commentListRef,
  commentPage,
  hasMoreComments,
  loadingMoreComments,
  loadMoreComments,
  showLessComments,
  styles,
}) {
  return (
    <Modal
      visible={commentModalVisible}
      animationType="slide"
      onRequestClose={() => setCommentModalVisible(false)}
    >
      <View style={{ flex: 1, backgroundColor: '#f5f5f5', paddingTop: Platform.OS === 'android' ? 8 : 0 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingTop: 2,
          paddingBottom: 6,
          backgroundColor: '#f5f5f5',
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0',
        }}>
          <TouchableOpacity onPress={() => {
            Keyboard.dismiss();
            setCommentModalVisible(false);
          }}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 10 }}>Comments</Text>
        </View>

        <View style={{ flex: 1, marginBottom: 60 }}>
          <FlatList
            ref={commentListRef}
            data={currentPostComments}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderComment}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyCommentsContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#A68C7B" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSubtext}>Be the first to comment!</Text>
              </View>
            }
            ListFooterComponent={
              currentPostComments.length > 0 ? (
                <View>
                  {commentPage > 1 && (
                    <TouchableOpacity
                      style={[styles.loadMoreCommentsButton, { backgroundColor: '#fff' }]}
                      onPress={showLessComments}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.loadMoreCommentsText}>Show Less</Text>
                        <Ionicons name="chevron-up" size={16} color="#A68C7B" style={{ marginLeft: 4 }} />
                      </View>
                    </TouchableOpacity>
                  )}
                  {hasMoreComments && (
                    <TouchableOpacity
                      style={styles.loadMoreCommentsButton}
                      onPress={loadMoreComments}
                      disabled={loadingMoreComments}
                    >
                      {loadingMoreComments ? (
                        <ActivityIndicator size="small" color="#A68C7B" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.loadMoreCommentsText}>Load More Comments</Text>
                          <Ionicons name="chevron-down" size={16} color="#A68C7B" style={{ marginLeft: 4 }} />
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : null
            }
            contentContainerStyle={
              currentPostComments.length === 0 ? { flex: 1 } : { paddingVertical: 16 }
            }
          />
        </View>

        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={0}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#999"
              value={newCommentText}
              onChangeText={setNewCommentText}
            />
            <TouchableOpacity onPress={postComment} style={styles.sendButton}>
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
