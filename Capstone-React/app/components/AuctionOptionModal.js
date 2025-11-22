import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewBidsModal from './ViewBidsModal';

export default function AuctionOptionModal({
  visible = false,
  onClose = () => {},
  auction = null,
  onEditAuction,
  onActivateNow,
  onViewBids,
  onPause,
  onResume,
  onCancel,
}) {
  const [showBidsModal, setShowBidsModal] = useState(false);
  const [selectedAuctionForBids, setSelectedAuctionForBids] = useState(null);

  const isVisible = Boolean(visible && auction);
  const status = (auction?.status || '').toString().trim().toLowerCase();
  const auctionTitle = auction?.auction_items?.title || auction?.title || 'Auction';
  const actions = [];

  // Open bids modal
  const openBidsModal = () => {
    setSelectedAuctionForBids(auction);
    setShowBidsModal(true);
    onClose?.();
  };

  // Allow edit unless cancelled
  if (status !== 'cancelled') {
    actions.push({
      key: 'edit',
      title: 'Edit Auction',
      desc: 'Update schedule and pricing',
      icon: 'pencil',
      onPress: () => {
        try {
          onEditAuction?.(auction);
          onClose?.();
        } catch (error) {
          console.error('Error in edit auction:', error);
        }
      },
    });
  }

  // Scheduled auction actions
  if (status === 'scheduled') {
    actions.push({
      key: 'activate',
      title: 'Activate Now',
      desc: 'Start the auction immediately',
      icon: 'flash',
      onPress: () => {
        try {
          onActivateNow?.(auction.auctionId);
          onClose?.();
        } catch (error) {
          console.error('Error activating auction:', error);
        }
      },
    });
  }

  // Active auction actions
  if (status === 'active') {
    actions.push(
      {
        key: 'view-bids',
        title: 'View Bids',
        desc: 'See bid history',
        icon: 'list',
        onPress: openBidsModal,
      },
      {
        key: 'pause',
        title: 'Pause',
        desc: 'Temporarily stop new bids',
        icon: 'pause',
        onPress: () => {
          try {
            onPause?.(auction.auctionId);
            onClose?.();
          } catch (error) {
            console.error('Error pausing auction:', error);
          }
        },
      },
      {
        key: 'cancel',
        title: 'Cancel Auction',
        desc: 'Permanently cancel',
        icon: 'close-circle',
        danger: true,
        onPress: () => {
          try {
            onCancel?.(auction.auctionId);
            onClose?.();
          } catch (error) {
            console.error('Error cancelling auction:', error);
          }
        },
      }
    );
  }

  // Paused auction actions
  if (status === 'paused') {
    actions.push(
      {
        key: 'view-bids',
        title: 'View Bids',
        desc: 'See bid history',
        icon: 'list',
        onPress: openBidsModal,
      },
      {
        key: 'resume',
        title: 'Resume Auction',
        desc: 'Continue accepting bids',
        icon: 'play',
        onPress: () => {
          try {
            onResume?.(auction.auctionId);
            onClose?.();
          } catch (error) {
            console.error('Error resuming auction:', error);
          }
        },
      },
      {
        key: 'cancel',
        title: 'Cancel Auction',
        desc: 'Permanently cancel',
        icon: 'close-circle',
        danger: true,
        onPress: () => {
          try {
            onCancel?.(auction.auctionId);
            onClose?.();
          } catch (error) {
            console.error('Error cancelling auction:', error);
          }
        },
      }
    );
  }

  // Ended auction actions
  if (status === 'ended') {
    actions.push({
      key: 'results',
      title: 'View Results',
      desc: 'Winning bid and ranking',
      icon: 'trophy',
      onPress: openBidsModal,
    });
  }

  // Settled auction actions
  if (status === 'settled') {
    actions.push({
      key: 'results',
      title: 'View Results',
      desc: 'Winning bid and ranking',
      icon: 'trophy',
      onPress: openBidsModal,
    });
  }

  // Cancelled auction actions
  if (status === 'cancelled') {
    actions.push({
      key: 'view-bids',
      title: 'View Bids',
      desc: 'See bid history',
      icon: 'list',
      onPress: openBidsModal,
    });
  }

  // Fallback: if no actions matched
  if (actions.length === 0) {
    actions.push({
      key: 'view-bids',
      title: 'View Bids',
      desc: 'See bid history',
      icon: 'list',
      onPress: openBidsModal,
    });
  }

  return (
    <>
      {/* Actions Modal */}
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Actions — {auctionTitle}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.subtitle}>Choose an action for this auction</Text>

              <View style={styles.actionsGrid}>
                {actions.map((action) => (
                  <TouchableOpacity
                    key={action.key}
                    style={[styles.actionCard, action.danger && styles.actionCardDanger]}
                    onPress={() => {
                      try {
                        if (action.onPress && typeof action.onPress === 'function') {
                          action.onPress();
                        } else {
                          console.error(`Action ${action.key} onPress is not a function`);
                        }
                      } catch (error) {
                        console.error(`Error executing action ${action.key}:`, error);
                      }
                    }}
                  >
                    <View style={styles.actionIconContainer}>
                      <Ionicons
                        name={action.icon}
                        size={24}
                        color={action.danger ? '#F44336' : '#A68C7B'}
                      />
                    </View>
                    <Text style={[styles.actionTitle, action.danger && styles.actionTitleDanger]}>
                      {action.title}
                    </Text>
                    <Text style={styles.actionDesc}>{action.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Bids Modal */}
      <ViewBidsModal
        open={showBidsModal}
        onClose={() => setShowBidsModal(false)}
        auctionId={selectedAuctionForBids?.auctionId}
        title={selectedAuctionForBids?.auction_items?.title || selectedAuctionForBids?.title || 'Auction'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#A68C7B',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },

  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },

  actionCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A68C7B',
    alignItems: 'center',
  },

  actionCardDanger: {
    borderColor: '#A68C7B',
  },

  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },

  actionTitleDanger: {
    color: '#F44336',
  },

  actionDesc: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },

  closeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#A68C7B',
    alignItems: 'center',
    marginBottom: 20,
  },

  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A68C7B',
  },
});
