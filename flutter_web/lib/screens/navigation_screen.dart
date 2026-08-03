import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../models/destination.dart';
import '../widgets/gabonese_pattern.dart';

/// Écran Navigation / Itinéraire simulé — affiche une carte stylisée avec
/// instructions de transport.
class NavigationScreen extends StatelessWidget {
  final Destination destination;

  const NavigationScreen({super.key, required this.destination});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(destination.fullName),
        actions: [
          IconButton(icon: const Icon(Icons.navigation), onPressed: () {}),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildMapCard(context),
                const SizedBox(height: AppSpacing.xl),
                _buildInfoCard(context),
                const SizedBox(height: AppSpacing.xl),
                _buildTransportSelector(context),
                const SizedBox(height: AppSpacing.xl),
                _buildInstructions(context),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMapCard(BuildContext context) {
    return Container(
      height: 320,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.xl),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.vertForet,
            AppColors.vertGabon,
            AppColors.bleuGabon,
          ],
        ),
        boxShadow: appShadow(),
      ),
      child: Stack(
        children: [
          const Positioned.fill(
            child: GabonesePattern(height: 80, opacity: 0.12),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '18 min',
                  style: AppTextStyles.displayLarge(color: AppColors.ivoire),
                ),
                Text(
                  '4,2 km • Taxi • 2 000 FCFA',
                  style: AppTextStyles.bodyMedium(
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(AppRadius.full),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Text(
                    'Navigation ●',
                    style: AppTextStyles.labelSmall(color: AppColors.ivoire),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            right: 24,
            top: 120,
            child: Column(
              children: [
                Container(
                  width: 16,
                  height: 16,
                  decoration: const BoxDecoration(
                    color: AppColors.jauneGabon,
                    shape: BoxShape.circle,
                    border: Border.fromBorderSide(
                      BorderSide(color: AppColors.ivoire, width: 3),
                    ),
                  ),
                ),
                Container(
                  width: 4,
                  height: 120,
                  color: Colors.white.withValues(alpha: 0.6),
                ),
                Container(
                  width: 16,
                  height: 16,
                  decoration: const BoxDecoration(
                    color: AppColors.ivoire,
                    shape: BoxShape.circle,
                    border: Border.fromBorderSide(
                      BorderSide(color: AppColors.jauneGabon, width: 3),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: appShadow(opacity: 0.06, blur: 10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Destination',
            style: AppTextStyles.labelSmall(color: AppColors.vertGabon),
          ),
          const SizedBox(height: 4),
          Text(destination.fullName, style: AppTextStyles.displaySmall()),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Continuer sur le Boulevard de l\'Indépendance, puis rejoindre le front de mer.',
            style: AppTextStyles.bodyMedium(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              _MiniStat(label: '18 min', value: 'temps restant'),
              const SizedBox(width: AppSpacing.md),
              _MiniStat(label: '4,2 km', value: 'distance'),
              const SizedBox(width: AppSpacing.md),
              _MiniStat(label: '≈ 2 000 FCFA', value: 'prix'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTransportSelector(BuildContext context) {
    final transports = [
      ('Taxi', Icons.local_taxi, '2 000 FCFA'),
      ('Bus', Icons.directions_bus, '500 FCFA'),
      ('Moto', Icons.motorcycle, '1 000 FCFA'),
      ('À pied', Icons.directions_walk, 'Gratuit'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Changer de transport', style: AppTextStyles.displaySmall()),
        const SizedBox(height: AppSpacing.md),
        SizedBox(
          height: 120,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: transports.length,
            separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.md),
            itemBuilder: (context, index) {
              final t = transports[index];
              return Container(
                width: 140,
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: AppColors.ligneDouce),
                  boxShadow: appShadow(opacity: 0.04, blur: 8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(t.$2, color: AppColors.vertGabon),
                    const Spacer(),
                    Text(t.$1, style: AppTextStyles.labelLarge()),
                    Text(
                      t.$3,
                      style: AppTextStyles.bodySmall(
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildInstructions(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: appShadow(opacity: 0.06, blur: 10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Instructions étape par étape',
            style: AppTextStyles.displaySmall(),
          ),
          const SizedBox(height: AppSpacing.md),
          _StepItem(
            number: '1',
            main: 'Continuer sur le Boulevard de l\'Indépendance',
            sub: 'Dans 600 m',
          ),
          const Divider(indent: 48),
          _StepItem(
            number: '2',
            main: 'Tourner vers le front de mer',
            sub: 'Direction sud',
          ),
          const Divider(indent: 48),
          _StepItem(
            number: '3',
            main: 'Arrivée à destination',
            sub: 'À votre droite',
          ),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label;
  final String value;
  const _MiniStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.ivoire,
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: AppTextStyles.labelLarge(color: AppColors.vertForet),
            ),
            Text(
              value,
              style: AppTextStyles.bodySmall(color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

class _StepItem extends StatelessWidget {
  final String number;
  final String main;
  final String sub;
  const _StepItem({
    required this.number,
    required this.main,
    required this.sub,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: AppColors.brumeVerte,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(
              number,
              style: AppTextStyles.labelMedium(color: AppColors.vertGabon),
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(main, style: AppTextStyles.labelLarge()),
              const SizedBox(height: 2),
              Text(
                sub,
                style: AppTextStyles.bodySmall(color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
