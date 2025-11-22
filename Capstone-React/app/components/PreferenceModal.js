import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';

export default function PreferenceModal({
  interestsModalVisible,
  setInterestsModalVisible,
  selectedInterests,
  setSelectedInterests,
  accessToken,
  refreshToken,
  setHasArtPreferences,
  API_BASE,
  styles,
}) {
  return (
    <Modal visible={interestsModalVisible} animationType="fade" transparent>
      <TouchableWithoutFeedback>
        <View style={styles.modalOverlay}>
          <View style={styles.interestsBox}>
            <Text style={styles.modalTitle}>Choose Your Art Interests</Text>
            <Text style={{ marginBottom: 10, color: '#555', textAlign: 'center' }}>
              Pick a few to personalize your feed
            </Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.interestsGrid}>
                {[
                  { id: 'classical', name: 'Classical Art', color: '#111' },
                  { id: 'contemporary', name: 'Contemporary', color: '#6b21a8' },
                  { id: 'impressionist', name: 'Impressionist', color: '#b45309' },
                  { id: 'abstract', name: 'Abstract', color: '#047857' },
                  { id: 'sculpture', name: 'Sculpture', color: '#1f2937' },
                  { id: 'photography', name: 'Photography', color: '#0ea5e9' },
                  { id: 'digital', name: 'Digital Art', color: '#7c3aed' },
                  { id: 'street', name: 'Street Art', color: '#f59e0b' },
                  { id: 'minimalist', name: 'Minimalist', color: '#4b5563' },
                  { id: 'surrealist', name: 'Surrealist', color: '#ef4444' },
                  { id: 'landscape', name: 'Landscape', color: '#10b981' },
                  { id: 'portrait', name: 'Portrait', color: '#60a5fa' },
                  { id: 'miniature', name: 'Miniature', color: '#f59e0b' },
                  { id: 'expressionist', name: 'Expressionist', color: '#ef4444' },
                  { id: 'realism', name: 'Realism', color: '#10b981' },
                  { id: 'conceptual', name: 'Conceptual', color: '#0ea5e9' },
                ].map((cat) => {
                  const selected = selectedInterests.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedInterests((prev) =>
                          prev.includes(cat.id)
                            ? prev.filter((x) => x !== cat.id)
                            : [...prev, cat.id]
                        );
                      }}
                      style={[styles.categoryCard, selected && { borderColor: cat.color, backgroundColor: '#f9fafb' }]}
                    >
                      <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.categoryText, selected && { color: cat.color }]} numberOfLines={1}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!!selectedInterests.length && (
                <Text style={{ marginTop: 6, marginBottom: 10, color: '#111', fontWeight: '600', textAlign: 'center' }}>
                  {selectedInterests.length} selected
                </Text>
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, gap: 10 }}>
              <TouchableOpacity
                style={[styles.cancelButton, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}
                onPress={() => setInterestsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Maybe later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { flex: 1, backgroundColor: '#A68C7B', opacity: selectedInterests.length ? 1 : 0.5, alignItems: 'center', justifyContent: 'center' }]}
                disabled={!selectedInterests.length}
                onPress={async () => {
                  const preferences = {
                    classicalArt: selectedInterests.includes('classical'),
                    contemporaryArt: selectedInterests.includes('contemporary'),
                    impressionist: selectedInterests.includes('impressionist'),
                    abstractArt: selectedInterests.includes('abstract'),
                    sculpture: selectedInterests.includes('sculpture'),
                    photography: selectedInterests.includes('photography'),
                    digitalArt: selectedInterests.includes('digital'),
                    streetArt: selectedInterests.includes('street'),
                    minimalist: selectedInterests.includes('minimalist'),
                    surrealist: selectedInterests.includes('surrealist'),
                    landscape: selectedInterests.includes('landscape'),
                    portrait: selectedInterests.includes('portrait'),
                    miniature: selectedInterests.includes('miniature'),
                    expressionist: selectedInterests.includes('expressionist'),
                    realism: selectedInterests.includes('realism'),
                    conceptual: selectedInterests.includes('conceptual'),
                  };
                  try {
                    const res = await fetch(`${API_BASE}/profile/saveArtPreferences`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Cookie': `access_token=${accessToken}; refresh_token=${refreshToken}`,
                      },
                      credentials: 'include',
                      body: JSON.stringify(preferences),
                    });
                    if (!res.ok) {
                      let errMsg = `Failed to save preferences (${res.status})`;
                      try {
                        const txt = await res.text();
                        try {
                          const j = txt ? JSON.parse(txt) : null;
                          if (j && (j.message || j.error)) errMsg = `${errMsg}: ${j.message || j.error}`;
                          else if (txt) errMsg = `${errMsg}: ${txt}`;
                        } catch {
                          if (txt) errMsg = `${errMsg}: ${txt}`;
                        }
                      } catch {}
                      throw new Error(errMsg);
                    }
                    setHasArtPreferences(true);
                    setInterestsModalVisible(false);
                  } catch (e) {
                    console.log('saveArtPreferences error:', e?.message || e);
                    alert(e?.message || 'Failed to save preferences');
                  }
                }}
              >
                <Text style={styles.saveButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
