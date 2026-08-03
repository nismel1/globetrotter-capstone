/// Modèle Proposition de destination — renvoyé par /proposals et /admin/proposals.
class Proposal {
  final String id;
  final String submittedBy;
  final String status; // pending | approved | rejected
  final String name;
  final String country;
  final String continent;
  final String city;
  final String description;
  final List<String> tags;
  final num avgCostPerDay;
  final String image;
  final String submittedAt;
  final String reviewedAt;
  final String adminComment;

  Proposal({
    required this.id,
    this.submittedBy = '',
    this.status = 'pending',
    required this.name,
    this.country = '',
    this.continent = '',
    this.city = '',
    this.description = '',
    this.tags = const [],
    this.avgCostPerDay = 0,
    this.image = '',
    this.submittedAt = '',
    this.reviewedAt = '',
    this.adminComment = '',
  });

  factory Proposal.fromJson(Map<String, dynamic> json) {
    return Proposal(
      id: (json['id'] ?? '').toString(),
      submittedBy: (json['submitted_by'] ?? '').toString(),
      status: (json['status'] ?? 'pending').toString(),
      name: (json['name'] ?? '').toString(),
      country: (json['country'] ?? '').toString(),
      continent: (json['continent'] ?? '').toString(),
      city: (json['city'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      tags:
          (json['tags'] as List?)?.map((e) => e.toString()).toList() ??
          const [],
      avgCostPerDay: json['avg_cost_per_day'] is num
          ? json['avg_cost_per_day'] as num
          : 0,
      image: (json['image'] ?? '').toString(),
      submittedAt: (json['submitted_at'] ?? '').toString(),
      reviewedAt: (json['reviewed_at'] ?? '').toString(),
      adminComment: (json['admin_comment'] ?? '').toString(),
    );
  }

  bool get isPending => status == 'pending';
  bool get isApproved => status == 'approved';
  bool get isRejected => status == 'rejected';
}

/// Statistiques système pour l'admin.
class SystemStats {
  final int totalUsers;
  final int totalDestinations;
  final int totalProposals;
  final int pendingProposals;
  final int approvedProposals;
  final int totalReviews;

  SystemStats({
    this.totalUsers = 0,
    this.totalDestinations = 0,
    this.totalProposals = 0,
    this.pendingProposals = 0,
    this.approvedProposals = 0,
    this.totalReviews = 0,
  });

  factory SystemStats.fromJson(Map<String, dynamic> json) {
    return SystemStats(
      totalUsers: (json['total_users'] is num)
          ? (json['total_users'] as num).toInt()
          : 0,
      totalDestinations: (json['total_destinations'] is num)
          ? (json['total_destinations'] as num).toInt()
          : 0,
      totalProposals: (json['total_proposals'] is num)
          ? (json['total_proposals'] as num).toInt()
          : 0,
      pendingProposals: (json['pending_proposals'] is num)
          ? (json['pending_proposals'] as num).toInt()
          : 0,
      approvedProposals: (json['approved_proposals'] is num)
          ? (json['approved_proposals'] as num).toInt()
          : 0,
      totalReviews: (json['total_reviews'] is num)
          ? (json['total_reviews'] as num).toInt()
          : 0,
    );
  }
}
