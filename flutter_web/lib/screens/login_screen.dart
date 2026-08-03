import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../widgets/gabonese_pattern.dart';

/// Écran connexion / inscription avec design Gabon.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isLogin = true;
  final _formKey = GlobalKey<FormState>();

  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    auth.clearError();

    final username = _usernameCtrl.text.trim();
    final password = _passwordCtrl.text;

    final success = _isLogin
        ? await auth.login(username, password)
        : await auth.register(username, password);

    if (!mounted) return;

    if (success) {
      // Navigation gérée par le router (AuthGate écoute authProvider).
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.error ?? 'Une erreur est survenue'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final loading = auth.loading;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppColors.vertForet,
              AppColors.vertGabon,
              AppColors.jauneGabon,
            ],
          ),
        ),
        child: Stack(
          children: [
            const Positioned.fill(
              child: GabonesePattern(height: 90, opacity: 0.15),
            ),
            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(AppSpacing.xl),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 460),
                    child: _buildCard(auth, loading),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(AuthProvider auth, bool loading) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        color: AppColors.ivoire.withValues(alpha: 0.98),
        borderRadius: BorderRadius.circular(AppRadius.xl),
        boxShadow: appShadow(
          color: AppColors.noirProfond,
          opacity: 0.25,
          blur: 30,
          y: 14,
        ),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Brand
            Row(
              children: [
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    color: AppColors.ivoire,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    boxShadow: appShadow(opacity: 0.1, blur: 12),
                  ),
                  child: const Icon(
                    Icons.explore,
                    size: 26,
                    color: AppColors.vertGabon,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Globetrotter Libreville',
                      style: AppTextStyles.displaySmall(),
                    ),
                    Text(
                      'Découvrir Libreville autrement',
                      style: AppTextStyles.bodySmall(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),

            // Mode toggle
            Row(
              children: [
                Expanded(
                  child: _ModeChip(
                    label: 'Connexion',
                    active: _isLogin,
                    onTap: () => setState(() => _isLogin = true),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: _ModeChip(
                    label: 'Inscription',
                    active: !_isLogin,
                    onTap: () => setState(() => _isLogin = false),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),

            Text(
              _isLogin ? 'Visiter, comprendre, ressentir' : 'Créer mon compte',
              style: AppTextStyles.displayMedium(),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              _isLogin
                  ? 'Entrez dans une expérience locale, chaleureuse et immersive au cœur de Libreville.'
                  : 'Rejoignez un voyage mobile pensé pour Libreville et découvrez peu après les 9 provinces.',
              style: AppTextStyles.bodyMedium(color: AppColors.textSecondary),
            ),
            const SizedBox(height: AppSpacing.xl),

            TextFormField(
              controller: _usernameCtrl,
              decoration: const InputDecoration(
                labelText: "Nom d'utilisateur",
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Requis' : null,
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _passwordCtrl,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Mot de passe',
                prefixIcon: Icon(Icons.lock_outline),
              ),
              validator: (v) => (v == null || v.isEmpty) ? 'Requis' : null,
            ),
            if (!_isLogin) ...[
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _confirmCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Confirmer le mot de passe',
                  prefixIcon: Icon(Icons.lock_outline),
                ),
                validator: (v) => (v != _passwordCtrl.text)
                    ? 'Les mots de passe ne correspondent pas'
                    : null,
              ),
            ],
            const SizedBox(height: AppSpacing.xl),

            FilledButton(
              onPressed: loading ? null : _submit,
              child: loading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: AppColors.ivoire,
                      ),
                    )
                  : Text(_isLogin ? 'Se connecter' : 'Créer mon compte'),
            ),
            const SizedBox(height: AppSpacing.sm),
            OutlinedButton(
              onPressed: loading
                  ? null
                  : () => setState(() {
                      _isLogin = !_isLogin;
                      _formKey.currentState?.reset();
                    }),
              child: Text(
                _isLogin ? 'Créer un compte' : 'Retour à la connexion',
              ),
            ),

            if (!_isLogin) ...[
              const SizedBox(height: AppSpacing.md),
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.brumeVerte,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Text(
                  'Votre compte vous permet de sauvegarder vos favoris, créer des roadmaps et proposer de nouvelles destinations.',
                  style: AppTextStyles.bodySmall(color: AppColors.vertForet),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ModeChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _ModeChip({
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        decoration: BoxDecoration(
          color: active ? AppColors.vertGabon : AppColors.ivoire,
          borderRadius: BorderRadius.circular(AppRadius.full),
          border: Border.all(
            color: active ? AppColors.vertGabon : AppColors.ligneDouce,
          ),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: AppTextStyles.labelMedium(
            color: active ? AppColors.ivoire : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}
