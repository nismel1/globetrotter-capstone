import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../models/destination.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';
import '../widgets/gabonese_pattern.dart';

/// Écran Événements culturels — filtres + événements des destinations.
class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  static const _filters = [
    'Tous',
    'Concert',
    'Culture',
    'Danse',
    'Exposition',
    'Marché',
    'Festival',
  ];

  String _selectedFilter = 'Tous';
  List<Destination> _destinations = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final all = await ApiService.instance.getDestinations();
      if (mounted) {
        setState(() {
          _destinations = all
              .where((d) => d.events.isNotEmpty || d.category == 'event')
              .toList();
          _loading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = e.toString();
        });
      }
    }
  }

  Iterable<Destination> get _filtered {
    if (_selectedFilter == 'Tous') return _destinations;
    return _destinations.where((d) {
      return d.events.any(
            (e) => e.toLowerCase().contains(_selectedFilter.toLowerCase()),
          ) ||
          d.category.toLowerCase().contains(_selectedFilter.toLowerCase()) ||
          d.name.toLowerCase().contains(_selectedFilter.toLowerCase()) ||
          d.tags.any(
            (t) => t.toLowerCase().contains(_selectedFilter.toLowerCase()),
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildHeader(context),
        _buildFilters(),
        Expanded(child: _buildBody()),
      ],
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.vertForet,
            AppColors.vertGabon,
            AppColors.bleuGabon,
          ],
        ),
        borderRadius: BorderRadius.vertical(
          bottom: Radius.circular(AppRadius.xl),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            const Positioned.fill(
              child: GabonesePattern(height: 80, opacity: 0.16),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Événements culturels',
                  style: AppTextStyles.labelSmall(color: AppColors.jauneGabon),
                ),
                const SizedBox(height: 4),
                Text(
                  'Vivre le Gabon à travers ses sons, ses danses et ses traditions',
                  style: AppTextStyles.displayMedium(color: AppColors.ivoire),
                ),
                const SizedBox(height: 6),
                Text(
                  'Musique, danse, artisanat et gastronomie se croisent pour raconter la ville autrement.',
                  style: AppTextStyles.bodyMedium(
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilters() {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      child: SizedBox(
        height: 40,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
          itemCount: _filters.length,
          separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.sm),
          itemBuilder: (context, index) {
            final f = _filters[index];
            return ChoiceChip(
              label: Text(f),
              selected: _selectedFilter == f,
              onSelected: (_) => setState(() => _selectedFilter = f),
            );
          },
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) return const LoadingView();
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);

    final events = _filtered.toList();
    if (events.isEmpty) {
      return const EmptyState(
        icon: Icons.event_busy,
        title: 'Aucun événement',
        message:
            'Essayez un autre filtre pour découvrir les événements culturels du Gabon.',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.xl),
      itemCount: events.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        final dest = events[index];
        return _EventCard(destination: dest);
      },
    );
  }
}

class _EventCard extends StatelessWidget {
  final Destination destination;

  const _EventCard({required this.destination});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: appShadow(opacity: 0.06, blur: 10),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.horizontal(
              left: Radius.circular(AppRadius.lg),
            ),
            child: SizedBox(
              width: 110,
              height: 140,
              child: Image.network(
                destination.image,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(
                  color: AppColors.brumeVerte,
                  child: const Icon(Icons.event, color: AppColors.vertGabon),
                ),
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    destination.category.toUpperCase(),
                    style: AppTextStyles.labelSmall(color: AppColors.vertGabon),
                  ),
                  const SizedBox(height: 4),
                  Text(destination.fullName, style: AppTextStyles.labelLarge()),
                  if (destination.description.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      destination.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.bodySmall(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  if (destination.events.isNotEmpty)
                    ...destination.events
                        .take(2)
                        .map(
                          (e) => Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(
                                  Icons.calendar_today,
                                  size: 14,
                                  color: AppColors.terreCuite,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    e,
                                    style: AppTextStyles.bodySmall(
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
