import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/theme.dart';
import '../models/user.dart';
import '../providers/auth_provider.dart';
import '../widgets/gabonese_pattern.dart';

/// Écran Profil — préférences, déconnexion.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  static const _allPreferences = [
    'beach',
    'nature',
    'culture',
    'food',
    'shopping',
    'adventure',
    'nightlife',
    'relaxation',
    'wellness',
    'event',
    'music',
    'history',
  ];

  Set<String> _selected = {};
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (auth.user != null) {
        setState(() => _selected = auth.user!.preferences.toSet());
      }
    });
  }

  Future<void> _savePreferences() async {
    setState(() => _saving = true);
    final auth = context.read<AuthProvider>();
    await auth.updatePreferences(_selected.toList());
    if (!mounted) return;
    setState(() => _saving = false);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Préférences sauvegardées')));
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Déconnexion'),
        content: const Text('Êtes-vous sûr de vouloir vous déconnecter ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Déconnexion'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await context.read<AuthProvider>().logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user ?? UserProfile(username: 'Voyageur');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 640),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildProfileCard(user),
              const SizedBox(height: AppSpacing.xl),
              Text('Vos préférences', style: AppTextStyles.displaySmall()),
              const SizedBox(height: 4),
              Text(
                'Elles permettent de personnaliser vos recommandations.',
                style: AppTextStyles.bodyMedium(color: AppColors.textSecondary),
              ),
              const SizedBox(height: AppSpacing.md),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: _allPreferences.map((p) {
                  final selected = _selected.contains(p);
                  return FilterChip(
                    label: Text(_cap(p)),
                    selected: selected,
                    onSelected: (value) {
                      setState(() {
                        if (value) {
                          _selected.add(p);
                        } else {
                          _selected.remove(p);
                        }
                      });
                    },
                    backgroundColor: AppColors.brumeVerte,
                    selectedColor: AppColors.vertGabon,
                    labelStyle: AppTextStyles.labelMedium(
                      color: selected ? AppColors.ivoire : AppColors.vertForet,
                    ),
                    checkmarkColor: AppColors.ivoire,
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton.icon(
                onPressed: _saving ? null : _savePreferences,
                icon: const Icon(Icons.save_outlined),
                label: Text(
                  _saving ? 'Sauvegarde…' : 'Sauvegarder mes préférences',
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              const Divider(),
              const SizedBox(height: AppSpacing.md),
              _MenuTile(
                icon: Icons.settings_outlined,
                label: 'Paramètres',
                onTap: () => _showInfo('Paramètres', 'Fonctionnalité à venir'),
              ),
              _MenuTile(
                icon: Icons.notifications_outlined,
                label: 'Notifications',
                onTap: () =>
                    _showInfo('Notifications', 'Fonctionnalité à venir'),
              ),
              _MenuTile(
                icon: Icons.help_outline,
                label: 'Aide & Support',
                onTap: () =>
                    _showInfo('Aide & Support', 'Fonctionnalité à venir'),
              ),
              _MenuTile(
                icon: Icons.info_outline,
                label: 'À propos',
                onTap: () => _showInfo(
                  'Globetrotter Libreville',
                  'Assistant de voyage pour découvrir le Gabon autrement.',
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _logout,
                  icon: const Icon(Icons.logout),
                  label: const Text('Se déconnecter'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileCard(UserProfile user) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppColors.vertForet, AppColors.vertGabon],
        ),
        borderRadius: BorderRadius.circular(AppRadius.xl),
        boxShadow: appShadow(
          color: AppColors.vertForet,
          opacity: 0.3,
          blur: 24,
          y: 12,
        ),
      ),
      child: Stack(
        children: [
          const Positioned.fill(
            child: GabonesePattern(height: 80, opacity: 0.14),
          ),
          Column(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.ivoire,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  boxShadow: appShadow(opacity: 0.2, blur: 14),
                ),
                child: Icon(
                  user.isAdmin ? Icons.admin_panel_settings : Icons.person,
                  size: 40,
                  color: user.isAdmin
                      ? AppColors.jauneGabon
                      : AppColors.vertGabon,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
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
                  user.isAdmin ? 'ADMINISTRATEUR' : 'PROFIL VOYAGEUR',
                  style: AppTextStyles.labelSmall(color: AppColors.noirProfond),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                user.username,
                style: AppTextStyles.displayMedium(color: AppColors.ivoire),
              ),
              const SizedBox(height: AppSpacing.md),
              Wrap(
                spacing: AppSpacing.lg,
                runSpacing: AppSpacing.sm,
                children: [
                  _ProfileStat(
                    value: '${user.preferences.length}',
                    label: 'préférences',
                  ),
                  _ProfileStat(value: 'Gabon', label: 'base'),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showInfo(String title, String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  String _cap(String s) {
    if (s.isEmpty) return s;
    return s[0].toUpperCase() + s.substring(1);
  }
}

class _ProfileStat extends StatelessWidget {
  final String value;
  final String label;
  const _ProfileStat({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: AppTextStyles.labelLarge(color: AppColors.ivoire)),
        Text(
          label,
          style: AppTextStyles.bodySmall(
            color: Colors.white.withValues(alpha: 0.85),
          ),
        ),
      ],
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _MenuTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: ListTile(
        leading: Icon(icon, color: AppColors.textPrimary),
        title: Text(label, style: AppTextStyles.labelLarge()),
        trailing: const Icon(Icons.chevron_right, color: AppColors.textMuted),
        onTap: onTap,
      ),
    );
  }
}
