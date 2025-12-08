# Testomat.io Integration Architecture

Visual guide to understanding how HearingClinic tests integrate with Testomat.io.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    HearingClinic Test Suite                     │
│                                                                 │
│  ┌──────────────────────┐      ┌──────────────────────┐       │
│  │   Backend Tests      │      │   Frontend Tests     │       │
│  │   (Python/Pytest)    │      │   (JavaScript/Jest)  │       │
│  │                      │      │                      │       │
│  │  • Value Add Card    │      │  • Customer UI       │       │
│  │  • Card Transaction  │      │  • VAC Application   │       │
│  │  • Customer ID       │      │  • Sales Invoice     │       │
│  │  • Duplicate Check   │      │  • UI Components     │       │
│  │  • API Endpoints     │      │                      │       │
│  │  • Integration       │      │  15+ tests           │       │
│  │                      │      │                      │       │
│  │  100+ tests          │      │                      │       │
│  └──────────┬───────────┘      └──────────┬───────────┘       │
│             │                             │                   │
│             │  pytest-testomat-reporter   │  @testomatio/     │
│             │  (Python plugin)            │  reporter         │
│             │                             │  (Jest plugin)    │
└─────────────┼─────────────────────────────┼───────────────────┘
              │                             │
              │                             │
              ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Testomat.io API                         │
│                      (https://api.testomat.io)                  │
│                                                                 │
│  • Receives test results in real-time                          │
│  • Processes test metadata (names, durations, status)          │
│  • Stores historical data                                      │
│  • Calculates analytics                                        │
└─────────────────────────────────────────────────────────────────┘
              │
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Testomat.io Dashboard                        │
│                   (https://app.testomat.io)                     │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐     │
│  │  Test Suite   │  │  Test Runs    │  │  Analytics    │     │
│  │               │  │               │  │               │     │
│  │  • All Tests  │  │  • Latest     │  │  • Trends     │     │
│  │  • Suites     │  │  • History    │  │  • Flaky      │     │
│  │  • Tags       │  │  • Scheduled  │  │  • Duration   │     │
│  └───────────────┘  └───────────────┘  └───────────────┘     │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐     │
│  │  Reports      │  │  Integrations │  │  Team         │     │
│  │               │  │               │  │               │     │
│  │  • Custom     │  │  • Jira       │  │  • Members    │     │
│  │  • Scheduled  │  │  • Slack      │  │  • Roles      │     │
│  │  • Export     │  │  • Webhooks   │  │  • Comments   │     │
│  └───────────────┘  └───────────────┘  └───────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Test Execution Flow

```
1. Developer/CI triggers test run
   ↓
2. Test framework starts (pytest/jest)
   ↓
3. Testomat reporter plugin loads
   ↓
4. Tests execute sequentially
   ↓
5. For each test:
   ├─ Reporter captures: name, status, duration, output
   ├─ Sends to Testomat API in real-time
   └─ Testomat stores and processes
   ↓
6. Test run completes
   ↓
7. Final summary sent to Testomat
   ↓
8. Dashboard updates with results
   ↓
9. Notifications sent (if configured)
```

### Test Import Flow

```
First-time setup:

1. Run import command
   ↓
2. Tool scans test files
   ↓
3. Extracts test structure:
   ├─ Test names
   ├─ Test descriptions
   ├─ File organization
   └─ Test metadata
   ↓
4. Creates hierarchy in Testomat
   ↓
5. Generates unique IDs for tests
   ↓
6. Optionally updates test files with IDs
   ↓
7. Test structure ready in dashboard
```

## Component Details

### 1. Backend Test Integration

**Technology Stack:**
```
Python → Pytest → pytest-testomat-reporter → Testomat API
```

**Configuration:**
- `pytest.ini` - Pytest settings and markers
- `.testomatrc` - Testomat configuration
- `requirements-test.txt` - Dependencies

**Test Execution:**
```bash
pytest --testomatio=$TESTOMATIO -v
```

**Data Sent:**
- Test name and description
- Test status (pass/fail/skip)
- Execution duration
- Error messages and stack traces
- Test markers/tags

### 2. Frontend Test Integration

**Technology Stack:**
```
JavaScript → Jest → @testomatio/reporter → Testomat API
```

**Configuration:**
- `package.json` - Jest reporter configuration
- Jest `reporters` array with Testomat reporter

**Test Execution:**
```bash
npm test  # with TESTOMATIO env var
```

**Data Sent:**
- Test suite and test names
- Test status
- Execution time
- Console output
- Suite hierarchy

### 3. CI/CD Integration

**GitHub Actions Workflow:**

```
GitHub Event (push/PR)
   ↓
Actions Runner starts
   ↓
Setup environment
   ↓
Install dependencies
   ↓
Set TESTOMATIO from secrets
   ↓
Run tests with Testomat reporting
   ↓
Results sent to Testomat in real-time
   ↓
Workflow completes
   ↓
Developer views results in:
   • GitHub Actions UI
   • Testomat Dashboard
```

## File Organization

### Test Files Hierarchy in Testomat

```
HearingClinic/
│
├── Backend/
│   ├── DocTypes/
│   │   ├── ValueAddCard/
│   │   │   ├── test_card_value_calculation
│   │   │   ├── test_add_purchase_transaction
│   │   │   ├── test_add_refund_transaction
│   │   │   └── ... (19 tests total)
│   │   │
│   │   └── CardTransaction/
│   │       ├── test_transaction_date_auto_set
│   │       ├── test_balance_before_stored
│   │       └── ... (13 tests total)
│   │
│   ├── BusinessLogic/
│   │   ├── CustomerID/
│   │   │   ├── test_get_gender_prefix_male
│   │   │   ├── test_generate_customer_id_format
│   │   │   └── ... (15 tests total)
│   │   │
│   │   └── DuplicateCheck/
│   │       ├── test_duplicate_nric_throws_error
│   │       └── ... (12 tests total)
│   │
│   └── API/
│       ├── test_check_card_balance_api
│       └── ... (12+ tests total)
│
├── Frontend/
│   ├── CustomerUI/
│   │   ├── test_format_male_customer_id
│   │   ├── test_customer_since_badge
│   │   └── ... (15+ tests)
│   │
│   └── VACApplication/
│       └── ...
│
└── Integration/
    ├── Workflows/
    │   ├── test_complete_customer_creation
    │   └── ... (15+ tests)
    │
    └── DataConsistency/
        └── ...
```

## Test Markers/Tags

Tests are organized with markers for filtering:

```
┌─────────────┬────────────────────────────────────┐
│   Marker    │           Description              │
├─────────────┼────────────────────────────────────┤
│ @unit       │ Unit tests (isolated functions)    │
│ @integration│ Integration tests (workflows)      │
│ @api        │ API endpoint tests                 │
│ @frontend   │ Frontend/UI tests                  │
│ @slow       │ Slow-running tests (>5 seconds)    │
│ @smoke      │ Critical path tests                │
│ @critical   │ Must-pass tests                    │
└─────────────┴────────────────────────────────────┘
```

Usage:
```bash
# Run only unit tests
pytest -m unit --testomatio=$TESTOMATIO

# Run smoke tests
pytest -m smoke --testomatio=$TESTOMATIO

# Run all except slow tests
pytest -m "not slow" --testomatio=$TESTOMATIO
```

## Security & Authentication

### API Key Management

```
┌─────────────────────────────────────────────────┐
│              API Key Storage                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  Local Development:                             │
│  └─ Environment variable: TESTOMATIO           │
│     ├─ Set in ~/.bashrc                        │
│     └─ Or .env file (not committed)            │
│                                                 │
│  CI/CD:                                         │
│  └─ GitHub Secrets                             │
│  └─ GitLab Variables                           │
│  └─ Jenkins Credentials                        │
│                                                 │
│  ❌ NEVER commit API key to repository         │
│  ✅ Use environment variables                  │
│  ✅ Use secrets management in CI               │
└─────────────────────────────────────────────────┘
```

### Data Transmission

```
Test Results → HTTPS (encrypted) → Testomat API
                                     ↓
                              Secure Storage
                                     ↓
                              Dashboard (HTTPS)
```

## Monitoring & Notifications

### Notification Flow

```
Test Run Completes
   ↓
Testomat Analyzes Results
   ↓
Checks Notification Rules:
   ├─ Any failures?
   ├─ Flaky tests detected?
   ├─ Coverage dropped?
   └─ Scheduled report due?
   ↓
Triggers Notifications:
   ├─ Email to team
   ├─ Slack message
   ├─ Webhook to custom service
   └─ Dashboard update
```

## Best Practices

### 1. Test Naming

```python
# Good - Descriptive
def test_card_value_calculated_with_1_6_multiplier():
    pass

# Bad - Vague
def test_calc():
    pass
```

### 2. Test Organization

```python
class TestValueAddCard:
    """All VAC tests in one class"""

    @pytest.mark.unit
    def test_card_creation(self):
        pass

    @pytest.mark.integration
    def test_complete_workflow(self):
        pass
```

### 3. CI Integration

```yaml
# Always use secrets
env:
  TESTOMATIO: ${{ secrets.TESTOMATIO }}

# Fail build on test failures
- run: pytest --testomatio=$TESTOMATIO
  continue-on-error: false
```

## Troubleshooting Flowchart

```
Tests not appearing in Testomat?
   ↓
   ├─ Is TESTOMATIO set?
   │  ├─ No → Set: export TESTOMATIO=key
   │  └─ Yes → Continue
   ↓
   ├─ Did you import tests?
   │  ├─ No → Run: npm run test:testomat:import
   │  └─ Yes → Continue
   ↓
   ├─ Is reporter installed?
   │  ├─ No → Run: pip install -r requirements-test.txt
   │  └─ Yes → Continue
   ↓
   ├─ Check API key validity
   │  └─ Visit: https://app.testomat.io/settings
   ↓
   └─ Contact support@testomat.io
```

## Performance Considerations

### Test Execution Time

```
Without Testomat:   ~60 seconds (100 tests)
With Testomat:      ~62 seconds (100 tests)
Overhead:           ~3% (reporting time)
```

**Optimization Tips:**
- Run tests in parallel: `pytest -n 4`
- Use test markers to run subsets: `pytest -m smoke`
- Schedule full runs nightly, smoke tests on commit

## Summary

The Testomat.io integration provides:

✅ **Minimal Setup** - One script to configure
✅ **Low Overhead** - <3% performance impact
✅ **Rich Features** - Analytics, trends, collaboration
✅ **CI/CD Ready** - GitHub Actions pre-configured
✅ **Team Friendly** - Shared dashboard and reports
✅ **Scalable** - Handles 100+ tests easily

---

**For Implementation Details**: See [TESTOMAT_INTEGRATION.md](TESTOMAT_INTEGRATION.md)
**For Quick Start**: See [README_TESTOMAT.md](README_TESTOMAT.md)

**Last Updated**: 2025-12-07
