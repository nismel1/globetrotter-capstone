import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../models/proposal.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';
import '../widgets/gabonese_pattern.dart';

/// Écran Admin — stats, modération propositions, utilisateurs, ajout destination.
class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  int _tab = 0; // 0 stats, 1 proposals, 2 users, 3 add

  SystemStats? _stats;
  List<Proposal> _proposals = [];
  List<UserProfile> _users = [];
  bool _loading = true;
  String? _error;

  bool _showAddForm = false;
  final _nameCtrl = TextEditingController();
  final _countryCtrl = TextEditingController(text: 'Gabon');
  final _continentCtrl = TextEditingController(text: 'Afrique');
  final _cityCtrl = TextEditingController(text: 'Libreville');
  final _descCtrl = TextEditingController();
  final _tagsCtrl = TextEditingController();
  final _costCtrl = TextEditingController();
  final _imageCtrl = TextEditingController();
  final _rejectCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _countryCtrl.dispose();
    _continentCtrl.dispose();
    _cityCtrl.dispose();
    _descCtrl.dispose();
    _tagsCtrl.dispose();
    _costCtrl.dispose();
    _imageCtrl.dispose();
    _rejectCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ApiService.instance;
      final stats = await api.getAdminStats();
      final proposals = await api.getAdminProposals();
      final users = await api.getAdminUsers();
      if (mounted) {
        setState(() {
          _stats = stats;
          _proposals = proposals;
          _users = users;
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

  Future<void> _approve(Proposal p) async {
    await ApiService.instance.approveProposal(p.id);
    _load();
  }

  Future<void> _reject(Proposal p) async {
    await ApiService.instance.rejectProposal(
      p.id,
      comment: _rejectCtrl.text.trim().isEmpty
          ? 'Veuillez fournir plus de détails'
          : _rejectCtrl.text.trim(),
    );
    _rejectCtrl.clear();
    _load();
  }

  Future<void> _addDestination() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return;
    final tags = _tagsCtrl.text
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    await ApiService.instance.adminAddDestination({
      'name': name,
      'country': _countryCtrl.text.trim(),
      'continent': _continentCtrl.text.trim(),
      'city': _cityCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
      'tags': tags,
      'avg_cost_per_day': double.tryParse(_costCtrl.text.trim()) ?? 50,
      'image': _imageCtrl.text.trim().isEmpty
          ? 'g1.jpg'
          : _imageCtrl.text.trim(),
    });
    setState(() => _showAddForm = false);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(context),
            _buildTabs(),
            Expanded(child: _buildContent()),
          ],
        ),
        if (_showAddForm) _buildAddForm(context),
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
                  'Administration',
                  style: AppTextStyles.labelSmall(color: AppColors.jauneGabon),
                ),
                const SizedBox(height: 4),
                Text(
                  'Panneau d\'administration',
                  style: AppTextStyles.displayMedium(color: AppColors.ivoire),
                ),
                const SizedBox(height: 6),
                Text(
                  'Statistiques, modération des propositions et gestion des utilisateurs.',
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

  Widget _buildTabs() {
    final tabs = ['Statistiques', 'Propositions', 'Utilisateurs', 'Ajouter'];
    return Container(
      color: AppColors.surface,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xl,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          children: List.generate(tabs.length, (i) {
            return Padding(
              padding: const EdgeInsets.only(right: AppSpacing.sm),
              child: ChoiceChip(
                label: Text(tabs[i]),
                selected: _tab == i,
                onSelected: (_) => setState(() => _tab = i),
              ),
            );
          }),
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (_loading) return const LoadingView();
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);

    switch (_tab) {
      case 0:
        return _buildStats();
      case 1:
        return _buildProposals();
      case 2:
        return _buildUsers();
      case 3:
        return _buildAddTab();
      default:
        return const SizedBox();
    }
  }

  Widget _buildStats() {
    final stats = _stats;
    if (stats == null) return const SizedBox();
    final width = MediaQuery.of(context).size.width;
    final columns = width > 900
        ? 3
        : width > 500
        ? 2
        : 1;
    return GridView.count(
      padding: const EdgeInsets.all(AppSpacing.xl),
      crossAxisCount: columns,
      mainAxisSpacing: AppSpacing.lg,
      crossAxisSpacing: AppSpacing.lg,
      childAspectRatio: 1.6,
      children: [
        StatCard(
          label: 'Utilisateurs',
          value: '${stats.totalUsers}',
          icon: Icons.people,
          color: AppColors.bleuGabon,
        ),
        StatCard(
          label: 'Destinations',
          value: '${stats.totalDestinations}',
          icon: Icons.place,
          color: AppColors.vertGabon,
        ),
        StatCard(
          label: 'Propositions',
          value: '${stats.totalProposals}',
          icon: Icons.send,
          color: AppColors.terreCuite,
        ),
        StatCard(
          label: 'En attente',
          value: '${stats.pendingProposals}',
          icon: Icons.hourglass_top,
          color: AppColors.jauneGabon,
        ),
        StatCard(
          label: 'Approuvées',
          value: '${stats.approvedProposals}',
          icon: Icons.check_circle,
          color: AppColors.vertGabon,
        ),
        StatCard(
          label: 'Avis',
          value: '${stats.totalReviews}',
          icon: Icons.rate_review,
          color: AppColors.bleuGabon,
        ),
      ],
    );
  }

  Widget _buildProposals() {
    if (_proposals.isEmpty) {
      return const EmptyState(
        icon: Icons.inbox_outlined,
        title: 'Aucune proposition',
        message:
            'Les propositions soumises par les utilisateurs apparaîtront ici.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.xl),
      itemCount: _proposals.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        final p = _proposals[index];
        return _AdminProposalCard(
          proposal: p,
          onApprove: () => _approve(p),
          onReject: () => _reject(p),
        );
      },
    );
  }

  Widget _buildUsers() {
    if (_users.isEmpty) {
      return const EmptyState(
        icon: Icons.people_outline,
        title: 'Aucun utilisateur',
        message: 'Les comptes enregistrés apparaîtront ici.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.xl),
      itemCount: _users.length,
      separatorBuilder: (_, _) => const Divider(),
      itemBuilder: (context, index) {
        final u = _users[index];
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: u.isAdmin
                ? AppColors.jauneGabon
                : AppColors.brumeVerte,
            child: Text(
              u.username.isEmpty ? '?' : u.username[0].toUpperCase(),
              style: AppTextStyles.labelSmall(color: AppColors.vertForet),
            ),
          ),
          title: Text(u.username, style: AppTextStyles.labelLarge()),
          subtitle: u.preferences.isEmpty
              ? Text(
                  'Aucune préférence',
                  style: AppTextStyles.bodySmall(color: AppColors.textMuted),
                )
              : Wrap(
                  spacing: 6,
                  children: u.preferences
                      .map(
                        (p) => Text(
                          p,
                          style: AppTextStyles.bodySmall(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      )
                      .toList(),
                ),
          trailing: u.isAdmin ? const Chip(label: Text('Admin')) : null,
        );
      },
    );
  }

  Widget _buildAddTab() {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: Card(
          color: AppColors.surface,
          elevation: 2,
          margin: const EdgeInsets.all(AppSpacing.xl),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ajouter une destination',
                  style: AppTextStyles.displaySmall(),
                ),
                const SizedBox(height: AppSpacing.md),
                Text('Nom *', style: AppTextStyles.labelMedium()),
                const SizedBox(height: 4),
                TextField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(
                    hintText: 'Ex: Parc National de Loango',
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _countryCtrl,
                        decoration: const InputDecoration(labelText: 'Pays'),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: TextField(
                        controller: _continentCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Continent',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: _cityCtrl,
                  decoration: const InputDecoration(labelText: 'Ville'),
                ),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: _descCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Description'),
                ),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: _tagsCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Tags (virgules)',
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _costCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Coût / jour (FCFA)',
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: TextField(
                        controller: _imageCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Image URL',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _addDestination,
                    icon: const Icon(Icons.add_location_alt),
                    label: const Text('Ajouter la destination'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAddForm(BuildContext context) {
    return Positioned.fill(
      child: Container(
        color: Colors.black.withValues(alpha: 0.5),
        alignment: Alignment.center,
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: GestureDetector(
          onTap: () => setState(() => _showAddForm = false),
          child: Container(
            width: 560,
            constraints: const BoxConstraints(maxHeight: 640),
            padding: const EdgeInsets.all(AppSpacing.xl),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.xl),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Ajouter une destination',
                        style: AppTextStyles.displaySmall(),
                      ),
                      IconButton(
                        onPressed: () => setState(() => _showAddForm = false),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text('Nom *', style: AppTextStyles.labelMedium()),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Ex: Parc National de Loango',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Pays', style: AppTextStyles.labelMedium()),
                            const SizedBox(height: 4),
                            TextField(controller: _countryCtrl),
                          ],
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Continent',
                              style: AppTextStyles.labelMedium(),
                            ),
                            const SizedBox(height: 4),
                            TextField(controller: _continentCtrl),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text('Ville', style: AppTextStyles.labelMedium()),
                  const SizedBox(height: 4),
                  TextField(controller: _cityCtrl),
                  const SizedBox(height: AppSpacing.md),
                  Text('Description', style: AppTextStyles.labelMedium()),
                  const SizedBox(height: 4),
                  TextField(controller: _descCtrl, maxLines: 3),
                  const SizedBox(height: AppSpacing.md),
                  Text('Tags (virgules)', style: AppTextStyles.labelMedium()),
                  const SizedBox(height: 4),
                  TextField(controller: _tagsCtrl),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Coût / jour (FCFA)',
                              style: AppTextStyles.labelMedium(),
                            ),
                            const SizedBox(height: 4),
                            TextField(
                              controller: _costCtrl,
                              keyboardType: TextInputType.number,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Image URL',
                              style: AppTextStyles.labelMedium(),
                            ),
                            const SizedBox(height: 4),
                            TextField(controller: _imageCtrl),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => setState(() => _showAddForm = false),
                          child: const Text('Annuler'),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: FilledButton(
                          onPressed: _addDestination,
                          child: const Text('Ajouter'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AdminProposalCard extends StatelessWidget {
  final Proposal proposal;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _AdminProposalCard({
    required this.proposal,
    required this.onApprove,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = proposal.isApproved
        ? AppColors.vertGabon
        : proposal.isRejected
        ? AppColors.error
        : AppColors.jauneGabon;
    final statusLabel = proposal.isApproved
        ? 'Approuvée'
        : proposal.isRejected
        ? 'Rejetée'
        : 'En attente';

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
          Row(
            children: [
              Expanded(
                child: Text(proposal.name, style: AppTextStyles.displaySmall()),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                  statusLabel,
                  style: AppTextStyles.labelSmall(color: statusColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Par ${proposal.submittedBy} • ${proposal.country}${proposal.city.isNotEmpty ? ' • ${proposal.city}' : ''}',
            style: AppTextStyles.bodySmall(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            proposal.description,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: AppTextStyles.bodyMedium(color: AppColors.textSecondary),
          ),
          if (proposal.tags.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              children: proposal.tags.map((t) => AppChip(label: t)).toList(),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          if (proposal.isPending)
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: onApprove,
                    icon: const Icon(Icons.check),
                    label: const Text('Approuver'),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onReject,
                    icon: const Icon(Icons.close),
                    label: const Text('Rejeter'),
                  ),
                ),
              ],
            )
          else if (proposal.adminComment.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.brumeVerte,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Text(
                'Commentaire : ${proposal.adminComment}',
                style: AppTextStyles.bodySmall(color: AppColors.vertForet),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              proposal.reviewedAt.isEmpty
                  ? 'Traité récemment'
                  : 'Traité le ${proposal.reviewedAt.substring(0, 10)}',
              style: AppTextStyles.bodySmall(color: AppColors.textMuted),
            ),
          ],
        ],
      ),
    );
  }
}
