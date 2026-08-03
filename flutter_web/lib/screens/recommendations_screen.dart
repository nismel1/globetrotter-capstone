import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/theme.dart';
import '../models/destination.dart';
import '../navigation/app_navigator.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';
import '../widgets/destination_card.dart';
import '../widgets/gabonese_pattern.dart';
import 'destination_detail_screen.dart';

/// Écran Recommandations personnalisées.
class RecommendationsScreen extends StatefulWidget {
  const RecommendationsScreen({super.key});

  @override
  State<RecommendationsScreen> createState() => _RecommendationsScreenState();
}

class _RecommendationsScreenState extends State<RecommendationsScreen> {
  List<Destination> _recommendations = [];
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
      final items = await ApiService.instance.getRecommendations(limit: 12);
      if (mounted) {
        setState(() {
          _recommendations = items;
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

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildHeader(context),
        Expanded(child: _buildBody(auth)),
      ],
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.xl),
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
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Pour vous',
                  style: AppTextStyles.labelSmall(color: AppColors.jauneGabon),
                ),
                const SizedBox(height: 4),
                Text(
                  'Recommandations personnalisées',
                  style: AppTextStyles.displayMedium(color: AppColors.ivoire),
                ),
                const SizedBox(height: 6),
                Text(
                  'Des destinations sélectionnées selon vos préférences de voyage.',
                  style: AppTextStyles.bodyMedium(
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: [
                    _Badge(text: 'Basé sur vos goûts'),
                    _Badge(text: 'Mis à jour en continu'),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(AuthProvider auth) {
    if (_loading) return const LoadingView();
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }

    if (_recommendations.isEmpty) {
      return EmptyState(
        icon: Icons.tips_and_updates_outlined,
        title: 'Pas encore de recommandations',
        message:
            'Ajoutez des préférences dans votre profil pour obtenir des suggestions personnalisées.',
        action: FilledButton.icon(
          onPressed: () => AppNavigator.switchTab(AppNavigator.profileTabIndex),
          icon: const Icon(Icons.person_outline),
          label: const Text('Modifier mes préférences'),
        ),
      );
    }

    final width = MediaQuery.of(context).size.width;
    final columns = width > 1100
        ? 4
        : width > 700
        ? 3
        : width > 480
        ? 2
        : 1;
    return GridView.builder(
      padding: const EdgeInsets.all(AppSpacing.xl),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns,
        mainAxisSpacing: AppSpacing.lg,
        crossAxisSpacing: AppSpacing.lg,
        childAspectRatio: 0.7,
      ),
      itemCount: _recommendations.length,
      itemBuilder: (context, index) {
        final dest = _recommendations[index];
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
  }
}

class _Badge extends StatelessWidget {
  final String text;
  const _Badge({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: 6,
      ),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: Text(
        text,
        style: AppTextStyles.labelSmall(color: AppColors.ivoire),
      ),
    );
  }
}
