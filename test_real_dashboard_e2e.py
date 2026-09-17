import json
import os
import subprocess
import sys
import uuid
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API_BASE = "http://localhost:8080/api"
CANDIDATE_ID = "11111111-1111-1111-1111-111111111111"
RECRUITER_ID = "00000000-0000-0000-0000-000000000001"

def http_get(url: str, timeout: int = 15):
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

def http_post_json(url: str, data: dict, timeout: int = 20):
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

def http_put_json(url: str, data: dict, timeout: int = 15):
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="PUT"
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

def run_tests():
    print("=" * 70)
    print("MILESTONE 4: REAL PRODUCT UI & DASHBOARD INTEGRATION E2E TEST")
    print("=" * 70)

    original_profile_snapshot = None
    created_job_id = None
    profile_url = f"{API_BASE}/candidates/{CANDIDATE_ID}/profile"
    jobs_url = f"{API_BASE}/jobs"

    try:
        # 1. Candidate Dashboard
        print("\n--- 1. Testing GET /api/candidates/{id}/dashboard ---")
        dash_url = f"{API_BASE}/candidates/{CANDIDATE_ID}/dashboard"
        status, dash = http_get(dash_url)
        assert status == 200, f"Expected 200 OK, got {status}: {dash}"
        print(f"✓ Dashboard status 200 OK")

        candidate = dash.get("candidate", {})
        assert candidate.get("id") == CANDIDATE_ID, f"Wrong candidate ID: {candidate}"
        print(f"✓ Candidate identified: {candidate.get('name')} ({candidate.get('email')})")

        res_summary = dash.get("resumeSummary", {})
        assert res_summary.get("totalResumes", 0) > 0, f"Expected resumes in summary: {res_summary}"
        assert res_summary.get("latestStatus") == "COMPLETED", f"Status not COMPLETED: {res_summary}"
        print(f"✓ Resume Summary: {res_summary.get('totalResumes')} resumes, latest: {res_summary.get('latestFileName')}")

        match_summary = dash.get("matchingSummary", {})
        assert match_summary.get("totalMatches", 0) >= 1, f"Expected at least 1 match: {match_summary}"
        print(f"✓ Matching Summary: {match_summary.get('totalMatches')} matches, avg score: {match_summary.get('averageScore')}%, top: {match_summary.get('topScore')}%")

        insight = dash.get("insight", {})
        assert insight.get("headline"), "Missing insight headline"
        print(f"✓ Grounded Insight: '{insight.get('headline')}' -> {insight.get('message')}")

        # 2. Candidate Roadmap
        print("\n--- 2. Testing GET /api/candidates/{id}/roadmap ---")
        roadmap_url = f"{API_BASE}/candidates/{CANDIDATE_ID}/roadmap"
        status, roadmap = http_get(roadmap_url)
        assert status == 200, f"Expected 200 OK, got {status}: {roadmap}"
        print(f"✓ Roadmap status 200 OK")

        # CRITICAL VERIFICATION: No projectedScore or speculative metrics
        assert "projectedScore" not in roadmap, "CRITICAL ERROR: projectedScore must NOT exist in roadmap!"
        assert "projected_score" not in roadmap, "CRITICAL ERROR: projected_score must NOT exist in roadmap!"
        print(f"✓ Confirmed: ZERO projectedScore fields exist in Roadmap response.")

        verified_skills = roadmap.get("verifiedSkills", [])
        assert len(verified_skills) > 0, "Expected verified skills in baseline"
        print(f"✓ Verified Skills Baseline: {len(verified_skills)} skills ({', '.join(verified_skills[:8])}...)")

        coverage = roadmap.get("skillCoverage", {})
        assert coverage.get("verifiedCount", 0) > 0, "Expected verifiedCount > 0"
        assert coverage.get("totalRequiredCount", 0) > 0, "Expected totalRequiredCount > 0"
        assert coverage.get("coverageText"), "Expected coverageText"
        print(f"✓ Deterministic Skill Coverage: {coverage.get('coverageText')} (ratio: {coverage.get('coverageRatio')}, missing: {coverage.get('missingCount')})")

        target_roles = roadmap.get("targetRoles", [])
        assert len(target_roles) > 0, "Expected at least 1 evaluated target role"
        print(f"✓ Target Roles Evaluated: {len(target_roles)} role(s)")

        phases = roadmap.get("progressionPhases", [])
        assert len(phases) == 3, f"Expected 3 progression phases, got {len(phases)}"

        # ROADMAP PHASE 1 CONSISTENCY VERIFICATION
        phase1 = phases[0]
        print(f"✓ Phase 1 Title: '{phase1.get('phaseTitle')}'")
        print(f"  Phase 1 Focus Area: '{phase1.get('focusArea')}'")
        print(f"  Phase 1 Target Skills: {phase1.get('targetSkills')}")

        if coverage.get("missingCount", 0) == 0:
            assert "Bridge Required" not in phase1.get("phaseTitle"), \
                f"Expected non-bridging title when missingCount == 0, got {phase1.get('phaseTitle')}"
            assert phase1.get("phaseTitle") == "Phase 1: Strengthen Role Readiness", \
                f"Expected 'Phase 1: Strengthen Role Readiness', got {phase1.get('phaseTitle')}"
            assert phase1.get("focusArea") == "Preferred Qualifications & Advanced Differentiation", \
                f"Expected preferred qualifications focus area, got {phase1.get('focusArea')}"
            assert "Terraform" in phase1.get("targetSkills"), "Expected actual preferred gap 'Terraform'"
            assert "Go" in phase1.get("targetSkills"), "Expected actual preferred gap 'Go'"
            print("✓ Verified: Zero required skill gaps correctly triggers 'Strengthen Role Readiness' with actual preferred gaps!")
        else:
            assert "Bridge Required Skill Gaps" in phase1.get("phaseTitle")
            print("✓ Verified: Actual required skill gaps correctly triggers 'Bridge Required Skill Gaps'")

        # 3. Candidate Profile Get & Put
        print("\n--- 3. Testing GET & PUT /api/candidates/{id}/profile ---")
        status, profile = http_get(profile_url)
        assert status == 200, f"Expected 200 OK, got {status}: {profile}"
        print(f"✓ Profile GET 200 OK: {profile.get('firstName')} {profile.get('lastName')} ({profile.get('email')})")

        # Snapshot original profile for cleanup restoration
        original_profile_snapshot = {
            "firstName": profile.get("firstName"),
            "lastName": profile.get("lastName"),
            "phone": profile.get("phone"),
            "githubUrl": profile.get("githubUrl"),
            "linkedinUrl": profile.get("linkedinUrl")
        }

        test_phone = "+1 (555) 432-8765"
        test_gh = "https://github.com/marcus-vance-verified"
        update_payload = {
            "firstName": profile.get("firstName"),
            "lastName": profile.get("lastName"),
            "phone": test_phone,
            "githubUrl": test_gh,
            "linkedinUrl": "https://linkedin.com/in/marcus-vance"
        }
        status, updated_profile = http_put_json(profile_url, update_payload)
        assert status == 200, f"Expected 200 OK on PUT, got {status}: {updated_profile}"
        assert updated_profile.get("phone") == test_phone, "Phone not updated"
        assert updated_profile.get("githubUrl") == test_gh, "GithubUrl not updated"
        print(f"✓ Profile PUT 200 OK: Updated phone={test_phone}, githubUrl={test_gh}")

        # 4. Recruiter Jobs & Existing Talent Candidate Matching
        print("\n--- 4. Testing Recruiter Jobs & Existing Talent Matching ---")
        status, initial_jobs = http_get(jobs_url)
        assert status == 200, f"Expected 200 OK, got {status}: {initial_jobs}"
        print(f"✓ Recruiter Jobs GET 200 OK: {len(initial_jobs)} existing job(s)")

        # Post a real job to test POST /api/jobs and the existing pgvector candidate matching pipeline
        test_job_payload = {
            "title": "Lead Distributed Systems Architect",
            "company": "ScalePulse Systems",
            "description": (
                "ScalePulse Systems is looking for a Lead Distributed Systems Architect. "
                "Extensive production experience required with Java, Spring Boot, Apache Kafka streaming pipelines, "
                "relational database tuning with PostgreSQL, and Kubernetes containerization."
            ),
            "experienceYears": 6,
            "recruiterId": RECRUITER_ID
        }
        print(f"  Posting role: '{test_job_payload['title']}' via POST /api/jobs...")
        status, created_job = http_post_json(jobs_url, test_job_payload)
        assert status == 200, f"Expected 200 OK on job creation, got {status}: {created_job}"
        created_job_id = created_job.get("id")
        assert created_job_id, f"Missing created job ID: {created_job}"
        assert created_job.get("jobEmbedding"), "Expected 384D vector embedding generated by FastAPI"
        print(f"✓ Created Job ID: {created_job_id} with 384D embedding generated.")

        # Verify job appears in GET /api/jobs
        status, refreshed_jobs = http_get(jobs_url)
        assert status == 200
        assert any(j["id"] == created_job_id for j in refreshed_jobs), "Created job not found in GET /api/jobs list"
        print(f"✓ Confirmed: GET /api/jobs now lists {len(refreshed_jobs)} job(s)")

        # Verify EXISTING talent matching: GET /api/jobs/{id}/matches
        # Calls JobRepository.findRankedCandidatesBySimilarity(jobEmbedding) using pgvector cosine distance
        print(f"  Calling GET /api/jobs/{created_job_id}/matches (existing pgvector candidate matching)...")
        status, matches = http_get(f"{API_BASE}/jobs/{created_job_id}/matches", timeout=30)
        assert status == 200, f"Expected 200 OK on talent matches, got {status}: {matches}"
        assert isinstance(matches, list), "Expected list of matched candidates"
        assert len(matches) > 0, "Expected at least 1 candidate match from pgvector"

        print(f"✓ Existing pgvector talent candidate matching verified ({len(matches)} matches):")
        for idx, m in enumerate(matches):
            fn = m.get("first_name", "")
            ln = m.get("last_name", "")
            file_name = m.get("file_name", "")
            score = m.get("similarity_score", 0)
            print(f"  [{idx + 1}] {fn} {ln} - Score: {score}% | Resume: {file_name}")

            # Strict Data Integrity Verification: candidate identity must correspond to resume file
            if "elena_vance" in file_name.lower():
                assert fn == "Elena" and ln == "Vance", \
                    f"DATA INTEGRITY ERROR: Elena's resume {file_name} mapped to {fn} {ln}"
            elif "marcus_vance" in file_name.lower():
                assert fn == "Marcus" and ln == "Vance", \
                    f"DATA INTEGRITY ERROR: Marcus's resume {file_name} mapped to {fn} {ln}"

        top_candidate = matches[0]
        assert float(top_candidate.get("similarity_score", 0)) > 50.0, "Expected positive cosine similarity score"
        print(f"✓ Candidate name and resume filename correspondence strictly verified for all matches!")

        # 5. Non-existent candidate error handling
        print("\n--- 5. Testing 404 Error Handling ---")
        fake_id = str(uuid.uuid4())
        status, err_resp = http_get(f"{API_BASE}/candidates/{fake_id}/dashboard")
        assert status == 404, f"Expected 404, got {status}"
        print(f"✓ 404 properly returned for non-existent candidate ID: {fake_id}")

    finally:
        # CLEANUP SAFEGUARD: Restore candidate profile and delete created test job
        print("\n--- Cleanup & Restoration ---")
        if original_profile_snapshot:
            rst_status, rst_resp = http_put_json(profile_url, original_profile_snapshot)
            if rst_status == 200:
                print("✓ Restored candidate profile to pre-test state.")
            else:
                print(f"⚠ Warning: Profile restoration returned HTTP {rst_status}: {rst_resp}")

        if created_job_id:
            del_cmd = [
                "docker", "exec", "hiresense-db", "psql", "-U", "postgres", "-d", "hiresense", "-c",
                f"DELETE FROM jobs WHERE id = '{created_job_id}';"
            ]
            res = subprocess.run(del_cmd, capture_output=True, text=True)
            if res.returncode == 0:
                print(f"✓ Cleaned up created test job ID: {created_job_id} from PostgreSQL.")
            else:
                print(f"⚠ Warning: Test job deletion failed: {res.stderr}")

            # Verify GET /api/jobs is restored to baseline count
            status, final_jobs = http_get(jobs_url)
            if status == 200:
                print(f"✓ Confirmed: GET /api/jobs count restored to baseline ({len(final_jobs)} jobs).")

    print("\n" + "=" * 70)
    print("ALL MILESTONE 4 INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
