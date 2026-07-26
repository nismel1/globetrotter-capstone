import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { favoritesAPI, reviewsAPI, visitedAPI } from '../services/api';
import Button from '../components/Button';
import ReviewCard from '../components/ReviewCard';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../config/theme';

const { width } = Dimensions.get('window');

const DestinationDetailScreen = ({ route, navigation }) => {
  const { destination } = route.params;
  const [isFavorite, setIsFavorite] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [currentUser, setCurrentUser] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [favorite, visited, reviewsData, username] = await Promise.all([
        favoritesAPI.isFavorite(destination.name),
        checkVisited(),
        reviewsAPI.getAll(destination.name),
        AsyncStorage.getItem('username'),
      ]);
      
      setIsFavorite(favorite);
      setIsVisited(visited);
      setReviews(reviewsData);
      setCurrentUser(username || '');
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const checkVisited = async () => {
    try {
      const visitedList = await visitedAPI.getAll();
      return visitedList.includes(destination.name);
    } catch (error) {
      return false;
    }
  };

  const handleToggleFavorite = async () => {
    try {
      if (isFavorite) {
        await favoritesAPI.remove(destination.name);
      } else {
        await favoritesAPI.add(destination.name);
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleToggleVisited = async () => {
    try {
      if (isVisited) {
        await visitedAPI.remove(destination.name);
        Alert.alert('Succès', 'Retiré de vos destinations visitées');
      } else {
        await visitedAPI.add(destination.name);
        Alert.alert('Succès', 'Ajouté à vos destinations visitées');
      }
      setIsVisited(!isVisited);
    } catch (error) {
      console.error('Error toggling visited:', error);
      Alert.alert('Erreur', 'Impossible de modifier le statut');
    }
  };

  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      Alert.alert('Erreur', 'Veuillez écrire un commentaire');
      return;
    }

    setLoading(true);
    try {
      const review = await reviewsAPI.create(
        destination.name,
        newReview.rating,
        newReview.comment
      );
      
      setReviews([review, ...reviews]);
      setShowReviewModal(false);
      setNewReview({ rating: 5, comment: '' });
      Alert.alert('Succès', 'Votre avis a été publié');
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.error || 'Impossible de publier l\'avis');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    Alert.alert(
      'Supprimer l\'avis',
      'Êtes-vous sûr de vouloir supprimer cet avis ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await reviewsAPI.delete(reviewId);
              setReviews(reviews.filter(r => r.id !== reviewId));
              Alert.alert('Succès', 'Avis supprimé');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'avis');
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating, onPress) => {
    return (
      <View style={styles.starsContainer}>
        {Array.from({ length: 5 }, (_, i) => (
          <TouchableOpacity key={i} onPress={() => onPress && onPress(i + 1)}>
            <Icon
              name="star"
              size={32}
              color="#FFB800"
              fill={i < rating ? '#FFB800' : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  let imageSource = require('../assets/placeholder.jpg');
  if (destination.image) {
    if (typeof destination.image === 'string' && (destination.image.startsWith('http://') || destination.image.startsWith('https://'))) {
      imageSource = { uri: destination.image };
    } else {
      imageSource = { uri: `http://10.0.2.2:5000/assets/${destination.image}` };
    }
  }

  const galleryImages = [
    require('../assets/gallery1.jpg'),
    require('../assets/gallery2.jpg'),
    require('../assets/gallery3.jpg'),
  ];

  const relatedPlaces = [
    {
      title: 'Restaurants proches',
      name: 'Maison Azur',
      description: 'Cuisine atlantique et terrasse douce',
      icon: 'coffee',
    },
    {
      title: 'Hotels',
      name: 'Casa Bruma',
      description: 'Suites claires face à l\'horizon',
      icon: 'home',
    },
    {
      title: 'Activités',
      name: 'Route panoramique',
      description: 'Océan, montagne et lumière',
      icon: 'activity',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image source={imageSource} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.heroGradient}
          />

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={COLORS.surface} />
          </TouchableOpacity>

          {/* Favorite Button */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleToggleFavorite}
          >
            <Icon
              name="heart"
              size={24}
              color={isFavorite ? COLORS.rosePoudre : COLORS.surface}
              fill={isFavorite ? COLORS.rosePoudre : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Eyebrow */}
          <View style={styles.eyebrow}>
            <Text style={styles.eyebrowText}>{destination.continent}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{destination.name}</Text>

          {/* Rating Row */}
          <View style={styles.ratingRow}>
            <Icon name="star" size={18} color="#FFB800" fill="#FFB800" />
            <Text style={styles.ratingValue}>4.8</Text>
            <Text style={styles.ratingLabel}>({reviews.length} avis)</Text>
            <Text style={styles.cost}>
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              }).format(destination.avg_cost_per_day)}
              /jour
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, isVisited && styles.actionButtonActive]}
              onPress={handleToggleVisited}
            >
              <Icon
                name="check-circle"
                size={20}
                color={isVisited ? COLORS.surface : COLORS.primary}
              />
              <Text style={[styles.actionButtonText, isVisited && styles.actionButtonTextActive]}>
                {isVisited ? 'Visité' : 'Marquer comme visité'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.description}>{destination.description}</Text>

          {/* Tags */}
          <View style={styles.tags}>
            {(destination.tags || []).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* Gallery */}
          <Text style={styles.sectionTitle}>Galerie</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gallery}
          >
            {galleryImages.map((image, index) => (
              <Image
                key={index}
                source={image}
                style={styles.galleryImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Related Places */}
          <Text style={styles.sectionTitle}>À découvrir</Text>
          <View style={styles.relatedGrid}>
            {relatedPlaces.map((place, index) => (
              <View key={index} style={styles.relatedCard}>
                <View style={styles.relatedIconContainer}>
                  <Icon name={place.icon} size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.relatedTitle}>{place.title}</Text>
                <Text style={styles.relatedName}>{place.name}</Text>
                <Text style={styles.relatedDescription}>
                  {place.description}
                </Text>
              </View>
            ))}
          </View>

          {/* Reviews Section */}
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Avis des voyageurs ({reviews.length})</Text>
            <Button
              title="Écrire un avis"
              variant="secondary"
              onPress={() => setShowReviewModal(true)}
              icon={<Icon name="edit-3" size={16} color={COLORS.primary} />}
              style={styles.writeReviewButton}
            />
          </View>

          {reviews.length > 0 ? (
            reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                currentUser={currentUser}
                onDelete={handleDeleteReview}
              />
            ))
          ) : (
            <View style={styles.noReviews}>
              <Icon name="message-circle" size={48} color={COLORS.textMuted} />
              <Text style={styles.noReviewsText}>
                Aucun avis pour le moment. Soyez le premier à partager votre
                expérience !
              </Text>
            </View>
          )}

          {/* Action Button */}
          <Button
            title={isFavorite ? "Retirer des favoris" : "Enregistrer ce lieu"}
            onPress={handleToggleFavorite}
            icon={
              <Icon
                name="heart"
                size={18}
                color={COLORS.surface}
              />
            }
          />
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Écrire un avis</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Icon name="x" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Note</Text>
            {renderStars(newReview.rating, (rating) =>
              setNewReview({ ...newReview, rating })
            )}

            <Text style={styles.modalLabel}>Votre commentaire</Text>
            <TextInput
              style={styles.modalTextArea}
              value={newReview.comment}
              onChangeText={(text) =>
                setNewReview({ ...newReview, comment: text })
              }
              placeholder="Partagez votre expérience..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <Button
              title="Publier l'avis"
              onPress={handleSubmitReview}
              loading={loading}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxxl,
  },
  heroContainer: {
    height: 400,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: SPACING.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 50,
    right: SPACING.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: SPACING.xl,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.rosePoudre,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
  },
  eyebrowText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.primary,
  },
  title: {
    ...TYPOGRAPHY.displayMedium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bleuGlacier,
  },
  ratingValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  ratingLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textSecondary,
    flex: 1,
  },
  cost: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.primary,
  },
  description: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.textSecondary,
    lineHeight: 28,
    marginBottom: SPACING.lg,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  tag: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.bleuClair,
    borderRadius: RADIUS.full,
  },
  tagText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.primary,
  },
  sectionTitle: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    marginTop: SPACING.lg,
  },
  gallery: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  galleryImage: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: RADIUS.md,
  },
  relatedGrid: {
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  relatedCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bleuClair,
    borderRadius: RADIUS.lg,
  },
  relatedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  relatedTitle: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  relatedName: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  relatedDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.bleuClair,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.bleuGlacier,
  },
  actionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.primary,
  },
  actionButtonTextActive: {
    color: COLORS.surface,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  writeReviewButton: {
    minHeight: 40,
    paddingHorizontal: SPACING.md,
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  noReviewsText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.lg,
    maxWidth: 300,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    ...TYPOGRAPHY.displaySmall,
    fontSize: 24,
    color: COLORS.textPrimary,
  },
  modalLabel: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  modalTextArea: {
    height: 150,
    borderWidth: 2,
    borderColor: COLORS.bleuGlacier,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
  },
});

export default DestinationDetailScreen;
