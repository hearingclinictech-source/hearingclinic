# Testomat.io Integration - Quick Start Guide

**Updated approach using JUnit XML and Testomat CLI tools**

## ⚡ 3-Step Setup

### 1. Get API Key
```bash
# Visit https://app.testomat.io
# Sign up → Create project → Copy API key
```

### 2. Run Setup
```bash
cd /workspace/frappe-bench/apps/hearingclinic
./setup_testomat.sh YOUR_API_KEY_HERE
```

### 3. Run Tests
```bash
./run_tests_with_reporting.sh [site-name]
```

**Done!** View at https://app.testomat.io

---

## 📖 How It Works

### Architecture

```
┌──────────────────┐
│  Run Tests       │
│  (pytest/jest)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Generate        │
│  JUnit XML       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  @testomatio/    │
│  reporter CLI    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Testomat.io     │
│  Dashboard       │
└──────────────────┘
```

### What Changed from Previous Approach

**Before (didn't work):**
- ❌ Used non-existent `pytest-testomat-reporter` package
- ❌ Direct pytest plugin integration

**Now (works):**
- ✅ Use standard pytest JUnit XML output
- ✅ Send results via `@testomatio/reporter` CLI tool
- ✅ Works with any test framework that outputs JUnit XML

---

## 🚀 Usage

### Option 1: Automated Script (Recommended)

```bash
export TESTOMATIO=your-api-key
./run_tests_with_reporting.sh test_site
```

This runs:
1. Backend tests with pytest → generates JUnit XML
2. Sends results to Testomat.io
3. Frontend tests with Jest → direct reporting
4. Shows summary

### Option 2: Manual Backend Tests

```bash
# Run tests
pytest apps/hearingclinic/hearingclinic \
    --junitxml=test-results.xml \
    --cov=apps/hearingclinic \
    -v

# Send to Testomat
npx @testomatio/reporter \
    --from-junit test-results.xml \
    --title "My Test Run"
```

### Option 3: Manual Frontend Tests

```bash
# Frontend tests already have direct integration
export TESTOMATIO=your-api-key
npm test
```

---

## 📦 What Gets Installed

### Python Packages
```bash
pip install pytest pytest-cov pytest-xdist
```

### Node Packages
```bash
# In package.json
npm install @testomatio/reporter
```

### Global CLI Tools
```bash
npm install -g @testomatio/reporter check-tests
```

---

## 🔧 CI/CD Integration

### GitHub Actions (Pre-configured)

Just add `TESTOMATIO` secret:
1. Repository → Settings → Secrets → Actions
2. New secret: `TESTOMATIO` = your-api-key

Workflow automatically:
- Runs pytest → JUnit XML
- Sends to Testomat.io
- Reports results

### Other CI Platforms

**GitLab CI:**
```yaml
test:
  script:
    - pytest --junitxml=results.xml
    - npx @testomatio/reporter --from-junit results.xml
  variables:
    TESTOMATIO: $TESTOMATIO_SECRET
```

**Jenkins:**
```groovy
stage('Test') {
    steps {
        sh 'pytest --junitxml=results.xml'
        sh 'npx @testomatio/reporter --from-junit results.xml'
    }
}
```

---

## 📊 Features

### Test Management
- ✅ Import test structure from code
- ✅ Organize in suites and folders
- ✅ Tag and categorize tests
- ✅ Search and filter

### Reporting
- ✅ Real-time test execution
- ✅ Historical test runs
- ✅ Pass/fail trends
- ✅ Duration analysis

### Analytics
- ✅ Flaky test detection
- ✅ Coverage tracking
- ✅ Test distribution
- ✅ Team metrics

### Integrations
- ✅ Jira - Link tests to issues
- ✅ Slack - Failure notifications
- ✅ Webhooks - Custom integrations
- ✅ CI/CD - All major platforms

---

## 🎯 Common Commands

```bash
# Setup (one-time)
./setup_testomat.sh YOUR_API_KEY

# Run all tests with reporting
./run_tests_with_reporting.sh

# Run backend only
pytest --junitxml=results.xml -v
npx @testomatio/reporter --from-junit results.xml

# Run frontend only
npm test

# Import test structure
npx check-tests jest 'tests/**/*.js' --create
```

---

## 🐛 Troubleshooting

### CLI Tool Not Found
```bash
# Install globally
npm install -g @testomatio/reporter check-tests

# Or use npx (auto-downloads)
npx @testomatio/reporter --help
```

### API Key Issues
```bash
# Check if set
echo $TESTOMATIO

# Set for session
export TESTOMATIO=your-key

# Set permanently
echo 'export TESTOMATIO=your-key' >> ~/.bashrc
source ~/.bashrc
```

### JUnit XML Not Generated
```bash
# Make sure pytest runs
pytest --version

# Check XML file created
ls -la test-results.xml

# Verify XML format
cat test-results.xml | head -20
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **TESTOMAT_QUICKSTART.md** | This file |
| **TESTOMAT_INTEGRATION.md** | Full integration guide |
| **TESTOMAT_ARCHITECTURE.md** | How it works |
| **README_TESTOMAT.md** | Quick reference |

---

## 💡 Pro Tips

### 1. Use Test IDs

Import your tests to get unique IDs:
```bash
npx check-tests jest '**/*.js' --update-ids
```

This adds IDs to your tests:
```javascript
// @T96f8b2c1
test('my test', () => {})
```

### 2. Custom Titles

Give meaningful names to test runs:
```bash
npx @testomatio/reporter \
    --from-junit results.xml \
    --title "Nightly Regression - $(date +%Y-%m-%d)"
```

### 3. Parallel Execution

Run tests faster:
```bash
pytest -n 4 --junitxml=results.xml
```

### 4. Filter Results

Send only specific results:
```bash
# Run only unit tests
pytest -m unit --junitxml=results-unit.xml

# Send to Testomat
npx @testomatio/reporter \
    --from-junit results-unit.xml \
    --title "Unit Tests Only"
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `echo $TESTOMATIO` shows your API key
- [ ] `pytest --version` works
- [ ] `npx @testomatio/reporter --version` works
- [ ] `./run_tests_with_reporting.sh` executes
- [ ] Tests appear at https://app.testomat.io
- [ ] CI/CD secret is set (for automation)

---

## 🎉 Success!

You should now have:
- ✅ All tests running locally
- ✅ Results sent to Testomat.io
- ✅ CI/CD integration ready
- ✅ Team dashboard accessible

**View your tests**: https://app.testomat.io

---

**Questions?** Check [TESTOMAT_INTEGRATION.md](TESTOMAT_INTEGRATION.md) for details

**Last Updated**: 2025-12-07
