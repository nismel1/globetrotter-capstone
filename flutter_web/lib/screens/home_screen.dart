import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/theme.dart';
import '../models/destination.dart';
import '../navigation/app_navigator.dart';
import '../providers/app_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/common.dart';
import '../widgets/destination_card.dart';
import '../widgets/gabonese_pattern.dart';
import 'destination_detail_screen.dart';

/// Écran d'accueil — hero, recherche, catégories, destinations, événements.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppProvider>();
    final auth = context.watch<AuthProvider>();
    final destinations = app.destinations;
    final popular = destinations.take(5).toList();

    return RefreshIndicator(
      onRefresh: () async {
        await app.loadDestinations();
      },
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: _buildHero(context, auth.username ?? 'Voyageur'),
          ),
          SliverToBoxAdapter(child: _buildQuickCategories(context)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xl,
                vertical: AppSpacing.md,
              ),
              child: SectionHeader(
                title: 'Destinations populaires',
                actionLabel: 'Voir la carte',
                onAction: () => _goExplorer(context),
              ),
            ),
          ),
          if (app.loading)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(AppSpacing.xl),
                child: LoadingView(),
              ),
            )
          else if (app.error != null)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: ErrorView(
                  message: app.error!,
                  onRetry: () => app.loadDestinations(),
                ),
              ),
            )
          else if (popular.isEmpty)
            const SliverToBoxAdapter(
              child: EmptyState(
                icon: Icons.place_outlined,
                title: 'Aucune destination',
                message: 'Le catalogue est vide pour le moment.',
              ),
            )
          else
            SliverToBoxAdapter(
              child: SizedBox(
                height: 260,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xl,
                  ),
                  itemCount: popular.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(width: AppSpacing.md),
                  itemBuilder: (context, index) {
                    final dest = popular[index];
                    return DestinationCard(
                      destination: dest,
                      width: 220,
                      onTap: () => _goDetail(context, dest),
                    );
                  },
                ),
              ),
            ),
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: AppSpacing.xl,
                vertical: AppSpacing.md,
              ),
              child: SectionHeader(title: 'Événement du moment'),
            ),
          ),
          const SliverToBoxAdapter(child: _FeatureEventCard()),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxl)),
        ],
      ),
    );
  }

  void _goExplorer(BuildContext context) {
    AppNavigator.switchTab(1);
  }

  void _goDetail(BuildContext context, Destination dest) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DestinationDetailScreen(destination: dest),
      ),
    );
  }

  // Hero
  Widget _buildHero(BuildContext context, String username) {
    return Container(
      height: 480,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppColors.vertForet, AppColors.vertGabon],
        ),
      ),
      child: Stack(
        children: [
          const Positioned.fill(
            child: GabonesePattern(height: 90, opacity: 0.12),
          ),
          Positioned(
            left: AppSpacing.xl,
            right: AppSpacing.xl,
            bottom: AppSpacing.xl,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.jauneGabon,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: Text(
                    'Bienvenue au Gabon',
                    style: AppTextStyles.labelSmall(
                      color: AppColors.noirProfond,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Explorer Libreville',
                  style: AppTextStyles.displayLarge(color: AppColors.ivoire),
                ),
                const SizedBox(height: 6),
                Text(
                  'Nature, culture, océan et traditions',
                  style: AppTextStyles.bodyLarge(
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                _buildSearchBar(context),
                const SizedBox(height: AppSpacing.lg),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  decoration: BoxDecoration(
                    color: AppColors.ivoire.withValues(alpha: 0.96),
                    borderRadius: BorderRadius.circular(AppRadius.xl),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Libreville authentique',
                        style: AppTextStyles.displaySmall(
                          color: AppColors.vertForet,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '20 lieux à découvrir entre front de mer, marchés, culture et nature.',
                        style: AppTextStyles.bodyMedium(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Wrap(
                        spacing: AppSpacing.sm,
                        children: [
                          'Culture',
                          'Nature',
                          'Plage',
                          'Histoire',
                        ].map((e) => _SmallBadge(label: e)).toList(),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      FilledButton.icon(
                        onPressed: () => _goExplorer(context),
                        icon: const Icon(Icons.explore),
                        label: const Text("Commencer l'exploration"),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    return GestureDetector(
      onTap: () => _goExplorer(context),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: AppColors.ivoire,
          borderRadius: BorderRadius.circular(AppRadius.full),
        ),
        child: const Row(
          children: [
            Icon(Icons.search, color: AppColors.textMuted),
            SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                'Rechercher un lieu, une plage, un événement…',
                style: TextStyle(color: AppColors.textMuted),
              ),
            ),
            Icon(Icons.tune, color: AppColors.vertGabon),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickCategories(BuildContext context) {
    final items = [
      ('Plages', Icons.beach_access, AppColors.bleuGabon),
      ('Nature', Icons.forest, AppColors.vertGabon),
      ('Culture', Icons.museum, AppColors.terreCuite),
      ('Marchés', Icons.storefront, AppColors.jauneGabon),
      ('Roadmap', Icons.map, AppColors.vertForet),
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xl,
        vertical: AppSpacing.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            title: 'Catégories rapides',
            actionLabel: 'Créer mon parcours',
            onAction: () => AppNavigator.switchTab(3),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            height: 64,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.sm),
              itemBuilder: (context, index) {
                final item = items[index];
                return GestureDetector(
                  onTap: () => _goExplorer(context),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: AppSpacing.sm,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(AppRadius.full),
                      border: Border.all(color: AppColors.ligneDouce),
                      boxShadow: appShadow(opacity: 0.06, blur: 10),
                    ),
                    child: Row(
                      children: [
                        Icon(item.$2, size: 18, color: item.$3),
                        const SizedBox(width: 6),
                        Text(item.$1, style: AppTextStyles.labelMedium()),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SmallBadge extends StatelessWidget {
  final String label;
  const _SmallBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: 6,
      ),
      decoration: BoxDecoration(
        color: AppColors.brumeVerte,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        label,
        style: AppTextStyles.labelSmall(color: AppColors.vertForet),
      ),
    );
  }
}

class _FeatureEventCard extends StatelessWidget {
  const _FeatureEventCard();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
      child: Container(
        height: 200,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppRadius.xl),
          gradient: const LinearGradient(
            colors: [AppColors.terreCuite, AppColors.vertGabon],
          ),
          boxShadow: appShadow(),
        ),
        child: Stack(
          children: [
            Positioned.fill(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.xl),
                child: const GabonesePattern(
                  height: 90,
                  opacity: 0.14,
                  color: AppColors.ivoire,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    'Gabon 9 Provinces',
                    style: AppTextStyles.labelSmall(
                      color: AppColors.jauneGabon,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Festival des danses et traditions',
                    style: AppTextStyles.displaySmall(color: AppColors.ivoire),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Libreville • Place des Artistes',
                    style: AppTextStyles.bodySmall(
                      color: Colors.white.withValues(alpha: 0.85),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
