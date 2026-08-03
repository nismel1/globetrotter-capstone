import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/theme.dart';
import '../models/destination.dart';
import '../providers/app_provider.dart';
import '../widgets/common.dart';
import '../widgets/destination_card.dart';
import '../widgets/gabonese_pattern.dart';
import 'destination_detail_screen.dart';

/// Écran Explorer — recherche + filtres + grille de destinations.
class ExplorerScreen extends StatefulWidget {
  const ExplorerScreen({super.key});

  @override
  State<ExplorerScreen> createState() => _ExplorerScreenState();
}

class _ExplorerScreenState extends State<ExplorerScreen> {
  final _searchCtrl = TextEditingController();
  String _selectedTag = '';
  String _selectedCategory = '';
  num? _maxCost;
  String? _city;

  static const _tags = [
    'beach',
    'nature',
    'culture',
    'food',
    'shopping',
    'adventure',
    'nightlife',
    'event',
    'relaxation',
    'wellness',
    'music',
  ];
  static const _categories = [
    '',
    'attraction',
    'beach',
    'park',
    'restaurant',
    'bar',
    'market',
    'event',
    'excursion',
    'museum',
  ];
  static const _cities = ['', 'Libreville'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppProvider>().loadDestinations();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _applyFilters() async {
    final app = context.read<AppProvider>();
    await app.loadDestinations(
      query: _searchCtrl.text.trim(),
      tag: _selectedTag,
      category: _selectedCategory,
      maxCost: _maxCost,
    );
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppProvider>();

    return Column(
      children: [
        _buildHeader(context),
        Expanded(
          child: Column(
            children: [
              _buildFilters(context),
              const Divider(height: 1),
              Expanded(
                child: app.loading
                    ? const LoadingView()
                    : app.error != null
                    ? ErrorView(message: app.error!, onRetry: _applyFilters)
                    : _buildGrid(app.destinations),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppColors.vertForet, AppColors.vertGabon],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            const Positioned.fill(
              child: GabonesePattern(height: 80, opacity: 0.12),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Les 9 provinces',
                    style: AppTextStyles.labelSmall(
                      color: AppColors.jauneGabon,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Découvrir le Gabon au-delà de Libreville',
                    style: AppTextStyles.displayMedium(color: AppColors.ivoire),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Une carte culturelle, patrimoniale et géographique pour parcourir le pays à votre rythme.',
                    style: AppTextStyles.bodyMedium(
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  TextField(
                    controller: _searchCtrl,
                    onSubmitted: (_) => _applyFilters(),
                    style: const TextStyle(color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Rechercher un lieu, une plage…',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.arrow_forward),
                        onPressed: _applyFilters,
                      ),
                      fillColor: AppColors.ivoire,
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

  Widget _buildFilters(BuildContext context) {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
              children: [
                AppChip(
                  label: 'Tous',
                  selected: _selectedTag.isEmpty,
                  onTap: () {
                    setState(() => _selectedTag = '');
                    _applyFilters();
                  },
                ),
                for (final tag in _tags) ...[
                  const SizedBox(width: AppSpacing.sm),
                  AppChip(
                    label: _capitalize(tag),
                    selected: _selectedTag == tag,
                    onTap: () {
                      setState(() => _selectedTag = tag);
                      _applyFilters();
                    },
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
            child: Row(
              children: [
                DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedCategory.isEmpty
                        ? 'all'
                        : _selectedCategory,
                    items: _categories
                        .map(
                          (c) => DropdownMenuItem(
                            value: c.isEmpty ? 'all' : c,
                            child: Text(c.isEmpty ? 'Toutes' : _capitalize(c)),
                          ),
                        )
                        .toList(),
                    onChanged: (v) {
                      setState(
                        () => _selectedCategory = (v == null || v == 'all')
                            ? ''
                            : v,
                      );
                      _applyFilters();
                    },
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                DropdownButtonHideUnderline(
                  child: DropdownButton<num>(
                    value: _maxCost ?? 0,
                    items: const [
                      DropdownMenuItem(value: 0, child: Text('Sans limite')),
                      DropdownMenuItem(
                        value: 5000,
                        child: Text('≤ 5 000 FCFA'),
                      ),
                      DropdownMenuItem(
                        value: 15000,
                        child: Text('≤ 15 000 FCFA'),
                      ),
                      DropdownMenuItem(
                        value: 35000,
                        child: Text('≤ 35 000 FCFA'),
                      ),
                    ],
                    onChanged: (v) {
                      setState(
                        () => _maxCost = (v == null || v == 0) ? null : v,
                      );
                      _applyFilters();
                    },
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _city ?? 'all',
                    items: _cities
                        .map(
                          (c) => DropdownMenuItem(
                            value: c.isEmpty ? 'all' : c,
                            child: Text(c.isEmpty ? 'Toutes' : c),
                          ),
                        )
                        .toList(),
                    onChanged: (v) {
                      setState(
                        () => _city = (v == null || v == 'all') ? null : v,
                      );
                      _applyFilters();
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGrid(List<Destination> destinations) {
    if (destinations.isEmpty) {
      return const EmptyState(
        icon: Icons.search_off,
        title: 'Aucun résultat',
        message: 'Essayez d\'élargir vos filtres ou modifiez votre recherche.',
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth > 1000
            ? 4
            : constraints.maxWidth > 600
            ? 3
            : 2;
        return GridView.builder(
          padding: const EdgeInsets.all(AppSpacing.xl),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            mainAxisSpacing: AppSpacing.lg,
            crossAxisSpacing: AppSpacing.lg,
            childAspectRatio: 0.72,
          ),
          itemCount: destinations.length,
          itemBuilder: (context, index) {
            final dest = destinations[index];
            return DestinationCard(
              destination: dest,
              showMatchScore: true,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => DestinationDetailScreen(destination: dest),
                ),
              ),
            );
          },
        );
      },
    );
  }

  String _capitalize(String s) {
    if (s.isEmpty) return s;
    return s[0].toUpperCase() + s.substring(1);
  }
}
