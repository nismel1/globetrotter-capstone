"""
Tests automatises pour l'API Globetrotter
"""
import sys
import os
import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"
TEST_USER = {
    "username": "test_user_" + datetime.now().strftime("%Y%m%d%H%M%S"),
    "password": "testpass123",
    "preferences": ["nature", "food"]
}
ADMIN_USER = {
    "username": "admin",
    "password": "admin123"
}

# Variables globales pour les tests
user_token = None
admin_token = None
test_destination_name = "Baie des Rois"
test_review_id = None
test_proposal_id = None

# Couleurs pour l'affichage
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


def print_test(test_name):
    """Afficher le nom du test."""
    print(f"\n{BLUE}eeee Test: {test_name}{RESET}")


def print_success(message):
    """Afficher un succes."""
    print(f"{GREEN}eee {message}{RESET}")


def print_error(message):
    """Afficher une erreur."""
    print(f"{RED}ee {message}{RESET}")


def print_info(message):
    """Afficher une info."""
    print(f"{YELLOW}eeee  {message}{RESET}")


# =============================================================================
# TESTS AUTHENTICATION
# =============================================================================

def test_register():
    """Test 1: Inscription d'un nouvel utilisateur"""
    print_test("Inscription d'un nouvel utilisateur")
    
    response = requests.post(
        f"{BASE_URL}/register",
        json=TEST_USER
    )
    
    if response.status_code == 201:
        print_success("Utilisateur cree avec succes")
        return True
    else:
        print_error(f"eechec de l'inscription: {response.json()}")
        return False


def test_login():
    """Test 2: Connexion utilisateur"""
    global user_token
    print_test("Connexion utilisateur")
    
    response = requests.post(
        f"{BASE_URL}/login",
        json={
            "username": TEST_USER["username"],
            "password": TEST_USER["password"]
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        user_token = data.get("token")
        print_success(f"Connexion reussie - Token: {user_token[:20]}...")
        return True
    else:
        print_error(f"eechec de la connexion: {response.json()}")
        return False


def test_admin_login():
    """Test 3: Connexion admin"""
    global admin_token
    print_test("Connexion admin")
    
    response = requests.post(
        f"{BASE_URL}/admin/login",
        json=ADMIN_USER
    )
    
    if response.status_code == 200:
        data = response.json()
        admin_token = data.get("token")
        print_success(f"Admin connecte - Token: {admin_token[:20]}...")
        return True
    else:
        print_error(f"eechec connexion admin: {response.json()}")
        return False


# =============================================================================
# TESTS DESTINATIONS
# =============================================================================

def test_get_destinations():
    """Test 4: Recuperer la liste des destinations"""
    print_test("Recuperation des destinations")
    
    response = requests.get(f"{BASE_URL}/destinations")
    
    if response.status_code == 200:
        destinations = response.json()
        print_success(f"Liste recuperee - {len(destinations)} destinations")
        return True
    else:
        print_error(f"eechec: {response.status_code}")
        return False


def test_search_destinations():
    """Test 5: Recherche de destinations"""
    print_test("Recherche avec filtres")
    
    response = requests.get(
        f"{BASE_URL}/destinations",
        params={"q": "royal", "tag": "food"}
    )
    
    if response.status_code == 200:
        results = response.json()
        print_success(f"Recherche reussie - {len(results)} resultats")
        return True
    else:
        print_error(f"eechec: {response.status_code}")
        return False


# =============================================================================
# TESTS REVIEWS
# =============================================================================

def test_create_review():
    """Test 6: Creer un avis"""
    global test_review_id
    print_test("Creation d'un avis")
    
    if not user_token:
        print_error("Token utilisateur manquant")
        return False
    
    response = requests.post(
        f"{BASE_URL}/reviews",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "destination_name": test_destination_name,
            "rating": 5,
            "comment": "Test automatise - Destination incroyable !"
        }
    )
    
    if response.status_code == 201:
        data = response.json()
        test_review_id = data.get("id")
        print_success(f"Avis cree - ID: {test_review_id}")
        return True
    else:
        print_error(f"eechec: {response.json()}")
        return False


def test_get_reviews():
    """Test 7: Recuperer les avis d'une destination"""
    print_test("Recuperation des avis")
    
    response = requests.get(
        f"{BASE_URL}/reviews",
        params={"destination": test_destination_name}
    )
    
    if response.status_code == 200:
        reviews = response.json()
        print_success(f"Avis recuperes - {len(reviews)} avis")
        return True
    else:
        print_error(f"eechec: {response.status_code}")
        return False


def test_delete_review():
    """Test 8: Supprimer un avis"""
    print_test("Suppression d'un avis")
    
    if not user_token or not test_review_id:
        print_error("Token ou ID manquant")
        return False
    
    response = requests.delete(
        f"{BASE_URL}/reviews/{test_review_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    if response.status_code == 200:
        print_success("Avis supprime")
        return True
    else:
        print_error(f"eechec: {response.json()}")
        return False


# =============================================================================
# TESTS VISITED
# =============================================================================

def test_mark_visited():
    """Test 9: Marquer une destination comme visitee"""
    print_test("Marquer comme visite")
    
    if not user_token:
        print_error("Token manquant")
        return False
    
    response = requests.post(
        f"{BASE_URL}/visited",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"destination_name": test_destination_name}
    )
    
    if response.status_code == 200:
        print_success(f"{test_destination_name} marque comme visite")
        return True
    else:
        print_error(f"eechec: {response.json()}")
        return False


def test_get_visited():
    """Test 10: Recuperer les destinations visitees"""
    print_test("Recuperation des destinations visitees")
    
    if not user_token:
        print_error("Token manquant")
        return False
    
    response = requests.get(
        f"{BASE_URL}/visited",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    if response.status_code == 200:
        visited = response.json()
        print_success(f"Liste recuperee - {len(visited)} destinations")
        return True
    else:
        print_error(f"eechec: {response.status_code}")
        return False


# =============================================================================
# TESTS FAVORITE NOTES
# =============================================================================

def test_create_favorite_note():
    """Test 11: Creer une note sur un favori"""
    print_test("Creation d'une note personnelle")
    
    if not user_token:
        print_error("Token manquant")
        return False
    
    response = requests.post(
        f"{BASE_URL}/favorite-notes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "destination_name": test_destination_name,
            "note": "Test automatise - Je veux visiter en ete",
            "visit_date": "eete 2025",
            "companions": "En famille",
            "budget": 3000
        }
    )
    
    if response.status_code == 200:
        print_success("Note creee avec succes")
        return True
    else:
        print_error(f"eechec: {response.json()}")
        return False


def test_get_favorite_notes():
    """Test 12: Recuperer les notes"""
    print_test("Recuperation des notes")
    
    if not user_token:
        print_error("Token manquant")
        return False
    
    response = requests.get(
        f"{BASE_URL}/favorite-notes",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    if response.status_code == 200:
        notes = response.json()
        print_success(f"Notes recuperees - {len(notes)} notes")
        return True
    else:
        print_error(f"eechec: {response.status_code}")
        return False


# =============================================================================
# TESTS PROPOSALS
# =============================================================================

def test_submit_proposal():
    """Test 13: Soumettre une proposition de destination"""
    global test_proposal_id
    print_test("Soumission d'une proposition")
    
    if not user_token:
        print_error("Token manquant")
        return False
    
    response = requests.post(
        f"{BASE_URL}/proposals",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "name": "Test Destination",
            "country": "Test Country",
            "continent": "Test Continent",
            "description": "Ceci est une destination de test automatise",
            "tags": ["test", "automation"],
            "avg_cost_per_day": 100
        }
    )
    
    if response.status_code == 201:
        data = response.json()
        test_proposal_id = data.get("proposal", {}).get("id")
        print_success(f"Proposition soumise - ID: {test_proposal_id}")
        return True
    else:
        print_error(f"eechec: {response.json()}")
        return False


def test_get_user_proposals():
    """Test 14: Recuperer ses propositions"""
    print_test("Recuperation des propositions utilisateur")
    
    if not user_token:
        print_error("Token manquant")
        return False
    
    response = requests.get(
        f"{BASE_URL}/proposals",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    if response.status_code == 200:
        proposals = response.json()
        print_success(f"Propositions recuperees - {len(proposals)} propositions")
        return True
    else:
        print_error(f"eechec: {response.status_code}")
        return False


def test_admin_get_proposals():
    """Test 15: Admin - Recuperer toutes les propositions"""
    print_test("Admin - Recuperation de toutes les propositions")
    
    if not admin_token:
        print_error("Token admin manquant")
        return False
    
    response = requests.get(
        f"{BASE_URL}/admin/proposals",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"status": "pending"}
    )
    
    if response.status_code == 200:
        proposals = response.json()
        print_success(f"Propositions en attente - {len(proposals)} propositions")
        return True
    else:
        print_error(f"eechec: {response.json()}")
        return False


def test_admin_approve_proposal():
    """Test 16: Admin - Approuver une proposition"""
    print_test("Admin - Approbation d'une proposition")
    
    if not admin_token or not test_proposal_id:
        print_error("Token admin ou ID manquant")
        return False
    
    response = requests.post(
        f"{BASE_URL}/admin/proposals/{test_proposal_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"comment": "Test automatise - Approuve"}
    )
    
    if response.status_code == 200:
        print_success("Proposition approuvee et ajoutee aux destinations")
        return True
    else:
        print_error(f"eechec: {response.json()}")
        return False


# =============================================================================
# EXeeCUTION DES TESTS
# =============================================================================

def run_all_tests():
    """Executer tous les tests"""
    print(f"\n{BLUE}{'='*60}")
    print(f"eeee TESTS AUTOMATISeeS - GLOBETROTTER API")
    print(f"{'='*60}{RESET}\n")
    
    print_info(f"URL de base: {BASE_URL}")
    print_info(f"Utilisateur test: {TEST_USER['username']}")
    
    tests = [
        # Authentication
        ("Inscription", test_register),
        ("Connexion utilisateur", test_login),
        ("Connexion admin", test_admin_login),
        
        # Destinations
        ("Liste destinations", test_get_destinations),
        ("Recherche destinations", test_search_destinations),
        
        # Reviews
        ("Creer avis", test_create_review),
        ("Lister avis", test_get_reviews),
        ("Supprimer avis", test_delete_review),
        
        # Visited
        ("Marquer visite", test_mark_visited),
        ("Lister visites", test_get_visited),
        
        # Favorite Notes
        ("Creer note", test_create_favorite_note),
        ("Lister notes", test_get_favorite_notes),
        
        # Proposals
        ("Soumettre proposition", test_submit_proposal),
        ("Lister propositions user", test_get_user_proposals),
        ("Admin lister propositions", test_admin_get_proposals),
        ("Admin approuver proposition", test_admin_approve_proposal),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if result:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print_error(f"Exception: {str(e)}")
            failed += 1
    
    # Resume
    print(f"\n{BLUE}{'='*60}")
    print(f"eeee ReeSUMee DES TESTS")
    print(f"{'='*60}{RESET}\n")
    
    total = passed + failed
    success_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"{GREEN}eee Tests reussis: {passed}/{total}{RESET}")
    print(f"{RED}ee Tests echoues: {failed}/{total}{RESET}")
    print(f"{YELLOW}eeee Taux de reussite: {success_rate:.1f}%{RESET}\n")
    
    if failed == 0:
        print(f"{GREEN}eeee TOUS LES TESTS SONT PASSeeS !{RESET}\n")
    else:
        print(f"{RED}eeee  CERTAINS TESTS ONT eeCHOUee{RESET}\n")
    
    return failed == 0


if __name__ == "__main__":
    try:
        success = run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Tests interrompus par l'utilisateur{RESET}\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n{RED}Erreur fatale: {str(e)}{RESET}\n")
        sys.exit(1)

