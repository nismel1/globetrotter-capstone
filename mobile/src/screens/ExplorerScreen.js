import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { destinationsAPI, favoritesAPI } from '../services/api';
import DestinationCard from '../components/DestinationCard';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../config/theme';

const ExplorerScreen = ({ navigation, route }) => {
  const [destinations, setDestinations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(route.params?.searchQuery || '');
  const [selectedTag, setSelectedTag] = useState(route.params?.tag || '');
  const [maxCost, setMaxCost] = useState('');

  const categories = [
    { label: 'Nature', tag: 'nature', icon: 'compass' },
    { label: 'Culture', tag: 'culture', icon: 'map' },
    { label: 'Restaurants', tag: 'food', icon: 'coffee' },
    { label: 'Activités', tag: 'adventure', icon: 'activity' },
    { label: 'Hotels', tag: 'wellness', icon: 'home' },
  ];

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedTag, maxCost]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [destinationsData, favoritesData] = await Promise.all([
        destinationsAPI.search(searchQuery, {
          tag: selectedTag,
          max_cost: maxCost,
        }),
        favoritesAPI.getAll(),
      ]);
      setDestinations(destinationsData);
      setFavorites(favoritesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (destinationName) => {
    try {
      const isFav = favorites.includes(destinationName);
      const newFavorites = isFav
        ? await favoritesAPI.remove(destinationName)
        : await favoritesAPI.add(destinationName);
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleTagPress = (tag) => {
    setSelectedTag(selectedTag === tag ? '' : tag);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Title */}
      <View style={styles.titleContainer}>
        <View style={styles.eyebrow}>
          <Text style={styles.eyebrowText}>EXPLORER</Text>
        </View>
        <Text style={styles.title}>Découvrez votre prochaine destination</Text>
      </View>

      {/* Search & Filters */}
      <View style={styles.filtersCard}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher..."
            placeholderTextColor={COLORS.textMuted}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="x" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Budget Filter */}
        <View style={styles.searchContainer}>
          <Icon name="dollar-sign" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={maxCost}
            onChangeText={setMaxCost}
            placeholder="Budget max/jour"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Category Filters */}
      <View style={styles.categoriesContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.tag}
            style={[
              styles.categoryChip,
              selectedTag === category.tag && styles.categoryChipActive,
            ]}
            onPress={() => handleTagPress(category.tag)}
          >
            <Icon
              name={category.icon}
              size={17}
              color={
                selectedTag === category.tag
                  ? COLORS.surface
                  : COLORS.textPrimary
              }
            />
            <Text
              style={[
                styles.categoryChipText,
                selectedTag === category.tag && styles.categoryChipTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results Count */}
      <Text style={styles.resultsText}>
        {destinations.length} destination{destinations.length > 1 ? 's' : ''} trouvée{destinations.length > 1 ? 's' : ''}
      </Text>
    </View>
  );

  const renderDestination = ({ item }) => (
    <DestinationCard
      destination={item}
      isFavorite={favorites.includes(item.name)}
      onPress={(dest) =>
        navigation.navigate('DestinationDetail', { destination: dest })
      }
      onToggleFavorite={handleToggleFavorite}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="map" size={64} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>Aucune destination trouvée</Text>
      <Text style={styles.emptyText}>
        Essayez de modifier vos filtres ou votre recherche
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={destinations}
        renderItem={renderDestination}
        keyExtractor={(item) => item.name}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading && renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  titleContainer: {
    marginBottom: SPACING.xl,
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
    ...TYPOGRAPHY.displaySmall,
    color: COLORS.textPrimary,
  },
  filtersCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.bleuClair,
    borderRadius: RADIUS.md,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.bleuGlacier,
    borderRadius: RADIUS.full,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textPrimary,
  },
  categoryChipTextActive: {
    color: COLORS.surface,
  },
  resultsText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyTitle: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

export default ExplorerScreen;
