import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../models/proposal.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';
import '../widgets/gabonese_pattern.dart';

/// Écran Propositions de destinations — soumettre + lister les siennes.
class ProposalsScreen extends StatefulWidget {
  const ProposalsScreen({super.key});

  @override
  State<ProposalsScreen> createState() => _ProposalsScreenState();
}

class _ProposalsScreenState extends State<ProposalsScreen> {
  List<Proposal> _proposals = [];
  bool _loading = true;
  String? _error;

  bool _showForm = false;
  final _nameCtrl = TextEditingController();
  final _countryCtrl = TextEditingController(text: 'Gabon');
  final _continentCtrl = TextEditingController(text: 'Afrique');
  final _cityCtrl = TextEditingController(text: 'Libreville');
  final _descCtrl = TextEditingController();
  final _tagsCtrl = TextEditingController();
  final _costCtrl = TextEditingController();
  final _imageCtrl = TextEditingController();

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
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final items = await ApiService.instance.getMyProposals();
      if (mounted) {
        setState(() {
          _proposals = items;
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

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    final country = _countryCtrl.text.trim();
    final continent = _continentCtrl.text.trim();
    final desc = _descCtrl.text.trim();
    if (name.isEmpty || country.isEmpty || continent.isEmpty || desc.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez remplir les champs obligatoires'),
        ),
      );
      return;
    }
    final tags = _tagsCtrl.text
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    final cost = double.tryParse(_costCtrl.text.trim()) ?? 0;
    try {
      await ApiService.instance.submitProposal(
        name: name,
        country: country,
        continent: continent,
        description: desc,
        tags: tags,
        avgCostPerDay: cost,
        image: _imageCtrl.text.trim().isEmpty
            ? 'placeholder.jpg'
            : _imageCtrl.text.trim(),
      );
      if (!mounted) return;
      setState(() => _showForm = false);
      _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _delete(String id) async {
    await ApiService.instance.deleteProposal(id);
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
            Expanded(child: _buildBody()),
          ],
        ),
        if (_showForm) _buildForm(context),
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
                  'Propositions',
                  style: AppTextStyles.labelSmall(color: AppColors.jauneGabon),
                ),
                const SizedBox(height: 4),
                Text(
                  'Proposer une destination',
                  style: AppTextStyles.displayMedium(color: AppColors.ivoire),
                ),
                const SizedBox(height: 6),
                Text(
                  'Participez à l\'enrichissement du catalogue. Votre proposition sera examinée par un administrateur.',
                  style: AppTextStyles.bodyMedium(
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                FilledButton.icon(
                  onPressed: () => setState(() => _showForm = true),
                  icon: const Icon(Icons.add_location_alt),
                  label: const Text('Proposer un lieu'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) return const LoadingView();
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);

    if (_proposals.isEmpty) {
      return const EmptyState(
        icon: Icons.location_city,
        title: 'Aucune proposition',
        message: 'Soumettez votre premier lieu à découvrir au Gabon.',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.xl),
      itemCount: _proposals.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        final p = _proposals[index];
        return _ProposalCard(proposal: p, onDelete: () => _delete(p.id));
      },
    );
  }

  Widget _buildForm(BuildContext context) {
    return Positioned.fill(
      child: Container(
        color: Colors.black.withValues(alpha: 0.5),
        alignment: Alignment.center,
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: GestureDetector(
          onTap: () => setState(() => _showForm = false),
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
                        'Nouvelle proposition',
                        style: AppTextStyles.displaySmall(),
                      ),
                      IconButton(
                        onPressed: () => setState(() => _showForm = false),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text('Nom du lieu *', style: AppTextStyles.labelMedium()),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Ex: Île aux Éléphants',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Pays *', style: AppTextStyles.labelMedium()),
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
                              'Continent *',
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
                  Text('Description *', style: AppTextStyles.labelMedium()),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _descCtrl,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      hintText: 'Décrivez ce lieu…',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Tags (séparés par des virgules)',
                    style: AppTextStyles.labelMedium(),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _tagsCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Ex: nature, plage, culture',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Coût moyen / jour (FCFA)',
                              style: AppTextStyles.labelMedium(),
                            ),
                            const SizedBox(height: 4),
                            TextField(
                              controller: _costCtrl,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                hintText: 'Ex: 15000',
                              ),
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
                            TextField(
                              controller: _imageCtrl,
                              decoration: const InputDecoration(
                                hintText: 'https://…',
                              ),
                            ),
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
                          onPressed: () => setState(() => _showForm = false),
                          child: const Text('Annuler'),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: FilledButton(
                          onPressed: _submit,
                          child: const Text('Soumettre'),
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

class _ProposalCard extends StatelessWidget {
  final Proposal proposal;
  final VoidCallback onDelete;

  const _ProposalCard({required this.proposal, required this.onDelete});

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
              IconButton(
                onPressed: onDelete,
                icon: const Icon(
                  Icons.delete_outline,
                  color: AppColors.textMuted,
                ),
                tooltip: 'Supprimer',
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${proposal.city} • ${proposal.country}',
            style: AppTextStyles.bodySmall(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            proposal.description,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: AppTextStyles.bodyMedium(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: proposal.tags.map((t) => AppChip(label: t)).toList(),
          ),
          if (proposal.adminComment.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.brumeVerte,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Text(
                'Commentaire admin : ${proposal.adminComment}',
                style: AppTextStyles.bodySmall(color: AppColors.vertForet),
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          Text(
            proposal.submittedAt.isEmpty
                ? 'Soumise récemment'
                : 'Soumise le ${proposal.submittedAt.substring(0, 10)}',
            style: AppTextStyles.bodySmall(color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}
