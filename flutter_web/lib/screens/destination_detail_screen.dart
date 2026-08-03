import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/theme.dart';
import '../models/destination.dart';
import '../models/review.dart';
import '../providers/app_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';
import '../widgets/gabonese_pattern.dart';

/// Écran détail destination — favori, visité, transports, événements, avis.
class DestinationDetailScreen extends StatefulWidget {
  final Destination destination;

  const DestinationDetailScreen({super.key, required this.destination});

  @override
  State<DestinationDetailScreen> createState() =>
      _DestinationDetailScreenState();
}

class _DestinationDetailScreenState extends State<DestinationDetailScreen> {
  bool _isFavorite = false;
  String? _activeTransport;
  List<Review> _reviews = [];
  bool _loadingReviews = true;
  bool _showReviewForm = false;
  double _newRating = 5;
  final _commentCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = ApiService.instance;
    try {
      final reviews = await api.getReviews(
        destinationName: widget.destination.name,
      );
      if (mounted) setState(() => _reviews = reviews);
    } catch (_) {}
    setState(() => _loadingReviews = false);
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Destination get destination => widget.destination;

  Future<void> _toggleVisited() async {
    final app = context.read<AppProvider>();
    await app.toggleVisited(destination);
  }

  Future<void> _toggleFavorite() async {
    setState(() => _isFavorite = !_isFavorite);
    // Persist via note system (empty note marks favorite).
    if (_isFavorite) {
      await ApiService.instance.saveFavoriteNote(
        destination.name,
        FavoriteNote(),
      );
    } else {
      await ApiService.instance.deleteFavoriteNote(destination.name);
    }
  }

  Future<void> _submitReview() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Connectez-vous pour laisser un avis')),
      );
      return;
    }
    try {
      await ApiService.instance.createReview(
        destinationName: destination.name,
        rating: _newRating,
        comment: _commentCtrl.text.trim(),
      );
      if (!mounted) return;
      _commentCtrl.clear();
      setState(() => _showReviewForm = false);
      _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppProvider>();
    final auth = context.watch<AuthProvider>();
    final isVisited = app.isVisited(destination.name);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 320,
            pinned: true,
            backgroundColor: AppColors.vertForet,
            foregroundColor: AppColors.ivoire,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    destination.image,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(
                      color: AppColors.vertGabon,
                      child: const Icon(
                        Icons.place,
                        size: 72,
                        color: AppColors.ivoire,
                      ),
                    ),
                  ),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.8),
                        ],
                      ),
                    ),
                  ),
                  const Positioned.fill(
                    child: GabonesePattern(height: 80, opacity: 0.1),
                  ),
                  Positioned(
                    left: AppSpacing.xl,
                    right: AppSpacing.xl,
                    bottom: AppSpacing.lg,
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
                            destination.category.toUpperCase(),
                            style: AppTextStyles.labelSmall(
                              color: AppColors.noirProfond,
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          destination.fullName,
                          style: AppTextStyles.displayLarge(
                            color: AppColors.ivoire,
                          ),
                        ),
                        if (destination.city.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            '${destination.city}, ${destination.country}',
                            style: AppTextStyles.bodyMedium(
                              color: Colors.white.withValues(alpha: 0.9),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              IconButton(
                tooltip: isVisited ? 'Déjà visité' : 'Marquer visité',
                icon: Icon(
                  isVisited ? Icons.check_circle : Icons.check_circle_outline,
                  color: isVisited ? AppColors.jauneGabon : AppColors.ivoire,
                ),
                onPressed: _toggleVisited,
              ),
              IconButton(
                tooltip: _isFavorite
                    ? 'Retirer des favoris'
                    : 'Ajouter aux favoris',
                icon: Icon(
                  _isFavorite ? Icons.favorite : Icons.favorite_border,
                  color: _isFavorite ? AppColors.jauneGabon : AppColors.ivoire,
                ),
                onPressed: _toggleFavorite,
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildMetaCard(),
                  const SizedBox(height: AppSpacing.xl),
                  _buildSectionTitle('Description'),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    destination.description.isEmpty
                        ? 'Découvrez ce lieu emblématique de ${destination.country}.'
                        : destination.description,
                    style: AppTextStyles.bodyMedium(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  if (destination.tags.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.md),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: destination.tags
                          .map((t) => AppChip(label: _cap(t)))
                          .toList(),
                    ),
                  ],
                  if (destination.openingHours.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xl),
                    _buildSectionTitle('Horaires'),
                    const SizedBox(height: AppSpacing.sm),
                    _InfoTile(
                      icon: Icons.schedule,
                      text: destination.openingHours,
                    ),
                  ],
                  if (destination.phone.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.sm),
                    _InfoTile(icon: Icons.phone, text: destination.phone),
                  ],
                  if (destination.website.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.sm),
                    _InfoTile(icon: Icons.language, text: destination.website),
                  ],
                  if (destination.estimatedPrices != null &&
                      destination.estimatedPrices!.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xl),
                    _buildSectionTitle('Prix estimés'),
                    const SizedBox(height: AppSpacing.sm),
                    _buildPrices(destination.estimatedPrices!),
                  ],
                  if (destination.transportRoutes != null &&
                      destination.transportRoutes!.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xl),
                    _buildSectionTitle('Transports'),
                    const SizedBox(height: AppSpacing.sm),
                    _buildTransport(destination.transportRoutes!),
                  ],
                  if (destination.events.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xl),
                    _buildSectionTitle('Événements'),
                    const SizedBox(height: AppSpacing.sm),
                    ...destination.events.map(
                      (e) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: _InfoTile(icon: Icons.event, text: e),
                      ),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.xl),
                  _buildSectionTitle('Avis (${_reviews.length})'),
                  const SizedBox(height: AppSpacing.sm),
                  _buildReviews(auth),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetaCard() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: appShadow(opacity: 0.08, blur: 12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _MetaItem(
            icon: Icons.star_rounded,
            value: destination.rating.toStringAsFixed(1),
            label: 'note',
            color: AppColors.jauneGabon,
          ),
          _MetaItem(
            icon: Icons.reviews,
            value: '${destination.reviewsCount}',
            label: 'avis',
            color: AppColors.bleuGabon,
          ),
          _MetaItem(
            icon: Icons.payments,
            value: destination.priceLabel.isNotEmpty
                ? destination.priceLabel
                : '${destination.avgCostPerDay} FCFA',
            label: 'prix/jour',
            color: AppColors.terreCuite,
          ),
        ],
      ),
    );
  }

  Widget _buildPrices(Map<String, dynamic> prices) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: appShadow(opacity: 0.06, blur: 10),
      ),
      child: Column(
        children: prices.entries
            .map(
              (e) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(_cap(e.key), style: AppTextStyles.bodyMedium()),
                    Text(
                      e.value.toString(),
                      style: AppTextStyles.labelMedium(
                        color: AppColors.vertForet,
                      ),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildTransport(Map<String, dynamic> routes) {
    return Column(
      children: routes.entries.map((e) {
        final selected = _activeTransport == e.key;
        return GestureDetector(
          onTap: () => setState(() => _activeTransport = e.key),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            margin: const EdgeInsets.only(bottom: AppSpacing.sm),
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: selected ? AppColors.vertGabon : AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(
                color: selected ? AppColors.vertGabon : AppColors.ligneDouce,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.directions_transit,
                  color: selected ? AppColors.ivoire : AppColors.vertForet,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Text(
                    _cap(e.key),
                    style: AppTextStyles.labelMedium(
                      color: selected
                          ? AppColors.ivoire
                          : AppColors.textPrimary,
                    ),
                  ),
                ),
                Text(
                  e.value.toString(),
                  style: AppTextStyles.bodySmall(
                    color: selected
                        ? Colors.white.withValues(alpha: 0.9)
                        : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(title, style: AppTextStyles.displaySmall());
  }

  Widget _buildReviews(AuthProvider auth) {
    if (_loadingReviews) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.lg),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (auth.isAuthenticated)
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: () =>
                  setState(() => _showReviewForm = !_showReviewForm),
              icon: Icon(_showReviewForm ? Icons.close : Icons.add_comment),
              label: Text(_showReviewForm ? 'Fermer' : 'Laisser un avis'),
            ),
          ),
        if (_showReviewForm) _buildReviewForm(),
        const SizedBox(height: AppSpacing.sm),
        if (_reviews.isEmpty)
          const EmptyState(
            icon: Icons.rate_review_outlined,
            title: 'Aucun avis',
            message: 'Soyez le premier à partager votre expérience.',
          )
        else
          ..._reviews.map(
            (r) => Container(
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: AppColors.ligneDouce),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: AppColors.brumeVerte,
                        child: Text(
                          r.username.isEmpty
                              ? '?'
                              : r.username[0].toUpperCase(),
                          style: AppTextStyles.labelSmall(
                            color: AppColors.vertForet,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          r.username,
                          style: AppTextStyles.labelMedium(),
                        ),
                      ),
                      Row(
                        children: List.generate(
                          5,
                          (i) => Icon(
                            i < r.rating.round()
                                ? Icons.star
                                : Icons.star_border,
                            size: 16,
                            color: AppColors.jauneGabon,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    r.comment,
                    style: AppTextStyles.bodyMedium(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  if (r.createdAt.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      r.createdAt.substring(0, 10),
                      style: AppTextStyles.bodySmall(
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildReviewForm() {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.lg),
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.brumeVerte,
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Votre note', style: AppTextStyles.labelMedium()),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: List.generate(5, (i) {
              return IconButton(
                onPressed: () => setState(() => _newRating = i + 1),
                icon: Icon(
                  i < _newRating.round() ? Icons.star : Icons.star_border,
                  color: AppColors.jauneGabon,
                  size: 30,
                ),
              );
            }),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: _commentCtrl,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'Partagez votre expérience…',
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          FilledButton(onPressed: _submitReview, child: const Text('Publier')),
        ],
      ),
    );
  }

  String _cap(String s) {
    if (s.isEmpty) return s;
    return s[0].toUpperCase() + s.substring(1);
  }
}

class _MetaItem extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  const _MetaItem({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(height: 6),
        Text(
          value,
          style: AppTextStyles.labelLarge(color: AppColors.vertForet),
        ),
        Text(label, style: AppTextStyles.bodySmall(color: AppColors.textMuted)),
      ],
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoTile({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.ligneDouce),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.vertGabon),
          const SizedBox(width: AppSpacing.md),
          Expanded(child: Text(text, style: AppTextStyles.bodyMedium())),
        ],
      ),
    );
  }
}
