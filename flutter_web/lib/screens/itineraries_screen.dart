import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/theme.dart';
import '../models/destination.dart';
import '../models/itinerary.dart';
import '../providers/app_provider.dart';
import '../services/api_service.dart';
import '../widgets/common.dart';

/// Écran Itinéraires / Roadmap — CRUD complet.
class ItinerariesScreen extends StatefulWidget {
  const ItinerariesScreen({super.key});

  @override
  State<ItinerariesScreen> createState() => _ItinerariesScreenState();
}

class _ItinerariesScreenState extends State<ItinerariesScreen> {
  List<Itinerary> _itineraries = [];
  bool _loading = true;
  String? _error;

  bool _showCreate = false;
  bool _editing = false;
  String? _editId;
  final _titleCtrl = TextEditingController();
  final _startCtrl = TextEditingController();
  final _endCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _destinationsCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _startCtrl.dispose();
    _endCtrl.dispose();
    _notesCtrl.dispose();
    _destinationsCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final items = await ApiService.instance.getItineraries();
      if (mounted) {
        setState(() {
          _itineraries = items;
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

  void _openCreate() {
    setState(() {
      _editing = false;
      _editId = null;
      _showCreate = true;
      _titleCtrl.clear();
      _startCtrl.clear();
      _endCtrl.clear();
      _notesCtrl.clear();
      _destinationsCtrl.clear();
    });
  }

  void _openEdit(Itinerary it) {
    setState(() {
      _editing = true;
      _editId = it.id;
      _showCreate = true;
      _titleCtrl.text = it.title;
      _startCtrl.text = it.startDate;
      _endCtrl.text = it.endDate;
      _notesCtrl.text = it.notes;
      _destinationsCtrl.text = it.destinations.join(', ');
    });
  }

  Future<void> _save() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) return;
    final destinations = _destinationsCtrl.text
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    final api = ApiService.instance;
    if (_editing && _editId != null) {
      await api.updateItinerary(
        _editId!,
        title: title,
        destinations: destinations,
        startDate: _startCtrl.text.trim(),
        endDate: _endCtrl.text.trim(),
        notes: _notesCtrl.text.trim(),
      );
    } else {
      await api.createItinerary(
        title: title,
        destinations: destinations,
        startDate: _startCtrl.text.trim(),
        endDate: _endCtrl.text.trim(),
        notes: _notesCtrl.text.trim(),
      );
    }
    setState(() => _showCreate = false);
    _load();
  }

  Future<void> _delete(String id) async {
    await ApiService.instance.deleteItinerary(id);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppProvider>();
    return Stack(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(context, app.destinations),
            Expanded(child: _buildBody()),
          ],
        ),
        if (_showCreate) _buildCreateDialog(context),
      ],
    );
  }

  Widget _buildHeader(BuildContext context, List<Destination> destinations) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppColors.vertForet,
            AppColors.vertGabon,
            AppColors.bleuGabon,
          ],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Ma roadmap',
              style: AppTextStyles.labelSmall(color: AppColors.jauneGabon),
            ),
            const SizedBox(height: 4),
            Text(
              'Composer une journée de découverte à Libreville',
              style: AppTextStyles.displayMedium(color: AppColors.ivoire),
            ),
            const SizedBox(height: 6),
            Text(
              'Organisez votre parcours par étape, puis lancez la navigation quand tout est prêt.',
              style: AppTextStyles.bodyMedium(
                color: Colors.white.withValues(alpha: 0.9),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                _StatPill(
                  icon: Icons.place,
                  value: '${_itineraries.length}',
                  label: 'itinéraires',
                ),
                _StatPill(
                  icon: Icons.timelapse,
                  value: '${destinations.length}',
                  label: 'destinations',
                ),
                FilledButton.icon(
                  onPressed: _openCreate,
                  icon: const Icon(Icons.add),
                  label: const Text('Nouveau parcours'),
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

    if (_itineraries.isEmpty) {
      return EmptyState(
        icon: Icons.map_outlined,
        title: 'Aucun itinéraire',
        message:
            'Créez votre premier parcours pour composer votre journée à Libreville.',
        action: FilledButton.icon(
          onPressed: _openCreate,
          icon: const Icon(Icons.add),
          label: const Text('Créer un parcours'),
        ),
      );
    }

    final width = MediaQuery.of(context).size.width;
    final columns = width > 1000 ? 2 : 1;
    return GridView.builder(
      padding: const EdgeInsets.all(AppSpacing.xl),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns,
        mainAxisSpacing: AppSpacing.lg,
        crossAxisSpacing: AppSpacing.lg,
        childAspectRatio: 2.0,
      ),
      itemCount: _itineraries.length,
      itemBuilder: (context, index) {
        final it = _itineraries[index];
        return _ItineraryCard(
          itinerary: it,
          onEdit: () => _openEdit(it),
          onDelete: () => _delete(it.id),
        );
      },
    );
  }

  Widget _buildCreateDialog(BuildContext context) {
    return Positioned.fill(
      child: Container(
        color: Colors.black.withValues(alpha: 0.5),
        alignment: Alignment.center,
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: GestureDetector(
          onTap: () => setState(() => _showCreate = false),
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
                        _editing ? 'Modifier le parcours' : 'Nouveau parcours',
                        style: AppTextStyles.displaySmall(),
                      ),
                      IconButton(
                        onPressed: () => setState(() => _showCreate = false),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text('Titre', style: AppTextStyles.labelMedium()),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _titleCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Ex: Journée au bord de mer',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Destinations (séparées par des virgules)',
                    style: AppTextStyles.labelMedium(),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _destinationsCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Ex: Baie des Rois, Marché du Centre…',
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
                              'Date de début',
                              style: AppTextStyles.labelMedium(),
                            ),
                            const SizedBox(height: 4),
                            TextField(
                              controller: _startCtrl,
                              decoration: const InputDecoration(
                                hintText: '2025-07-01',
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
                              'Date de fin',
                              style: AppTextStyles.labelMedium(),
                            ),
                            const SizedBox(height: 4),
                            TextField(
                              controller: _endCtrl,
                              decoration: const InputDecoration(
                                hintText: '2025-07-02',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text('Notes', style: AppTextStyles.labelMedium()),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _notesCtrl,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'Notes libres…',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => setState(() => _showCreate = false),
                          child: const Text('Annuler'),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: FilledButton(
                          onPressed: _save,
                          child: const Text('Enregistrer'),
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

class _StatPill extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;

  const _StatPill({
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: AppColors.jauneGabon),
          const SizedBox(width: 6),
          Text(
            value,
            style: AppTextStyles.labelMedium(color: AppColors.ivoire),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: AppTextStyles.bodySmall(
              color: Colors.white.withValues(alpha: 0.85),
            ),
          ),
        ],
      ),
    );
  }
}

class _ItineraryCard extends StatelessWidget {
  final Itinerary itinerary;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _ItineraryCard({
    required this.itinerary,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: appShadow(opacity: 0.08, blur: 12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  itinerary.title,
                  style: AppTextStyles.displaySmall(),
                ),
              ),
              IconButton(
                onPressed: onEdit,
                icon: const Icon(
                  Icons.edit_outlined,
                  color: AppColors.vertGabon,
                ),
                tooltip: 'Modifier',
              ),
              IconButton(
                onPressed: onDelete,
                icon: const Icon(Icons.delete_outline, color: AppColors.error),
                tooltip: 'Supprimer',
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          if (itinerary.destinations.isNotEmpty)
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: itinerary.destinations
                  .map(
                    (d) => Chip(
                      label: Text(d),
                      labelStyle: AppTextStyles.labelSmall(
                        color: AppColors.vertForet,
                      ),
                      backgroundColor: AppColors.brumeVerte,
                      side: BorderSide.none,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.full),
                      ),
                    ),
                  )
                  .toList(),
            )
          else
            Text(
              'Aucune destination',
              style: AppTextStyles.bodySmall(color: AppColors.textMuted),
            ),
          const SizedBox(height: AppSpacing.md),
          if (itinerary.startDate.isNotEmpty || itinerary.endDate.isNotEmpty)
            Text(
              '${itinerary.startDate} → ${itinerary.endDate}',
              style: AppTextStyles.bodySmall(color: AppColors.textSecondary),
            ),
          if (itinerary.notes.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              itinerary.notes,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.bodySmall(color: AppColors.textMuted),
            ),
          ],
        ],
      ),
    );
  }
}
