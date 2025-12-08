# Testomat.io Integration - Quick Reference

Complete Testomat.io integration for the HearingClinic ERPNext app test suite.

## 🚀 Quick Start (3 Steps)

### 1. Get Your API Key
- Sign up at https://app.testomat.io
- Create project "HearingClinic"
- Copy API key from **Settings → API Keys**

### 2. Run Setup
```bash
cd apps/hearingclinic
./setup_testomat.sh YOUR_API_KEY
```

### 3. Run Tests
```bash
./run_tests_testomat.sh [site-name]
```

**That's it!** View results at https://app.testomat.io 🎉

---

## 📁 What Was Created

### Configuration Files
- **[.testomatrc](.testomatrc)** - Testomat configuration
- **[pytest.ini](pytest.ini)** - Pytest with test markers
- **[requirements-test.txt](requirements-test.txt)** - Python dependencies
- **[package.json](package.json)** - Updated with Testomat scripts

### Scripts
- **[setup_testomat.sh](setup_testomat.sh)** - One-time setup script
- **[run_tests_testomat.sh](run_tests_testomat.sh)** - Test runner with reporting

### Documentation
- **[TESTOMAT_INTEGRATION.md](TESTOMAT_INTEGRATION.md)** - Complete integration guide
- **[TESTING.md](TESTING.md)** - Updated with Testomat section

### CI/CD
- **[.github/workflows/tests.yml](.github/workflows/tests.yml)** - GitHub Actions with Testomat

---

## 💡 Usage Examples

### Backend Tests Only
```bash
export TESTOMATIO=your-api-key
pytest apps/hearingclinic/hearingclinic \
    --testomatio=$TESTOMATIO \
    -v
```

### Frontend Tests Only
```bash
export TESTOMATIO=your-api-key
npm run test:testomat:report
```

### All Tests (Recommended)
```bash
export TESTOMATIO=your-api-key
./run_tests_testomat.sh test_site
```

### Specific Test Markers
```bash
# Unit tests only
pytest -m unit --testomatio=$TESTOMATIO

# Integration tests only
pytest -m integration --testomatio=$TESTOMATIO

# API tests only
pytest -m api --testomatio=$TESTOMATIO
```

---

## 🔧 CI/CD Setup

### GitHub Actions
1. Go to **Repository Settings → Secrets → Actions**
2. Add secret: **Name:** `TESTOMATIO`, **Value:** your-api-key
3. Push code - tests run automatically!

### GitLab CI
```yaml
test:
  script:
    - export TESTOMATIO=$TESTOMATIO_SECRET
    - ./run_tests_testomat.sh
```

### Jenkins
```groovy
environment {
    TESTOMATIO = credentials('testomatio-api-key')
}
```

---

## 📊 Features

### Test Management
- ✅ All 100+ tests organized in Testomat dashboard
- ✅ Hierarchical test structure (suites/groups)
- ✅ Test tagging and categorization
- ✅ Search and filter tests

### Analytics
- 📈 Test execution trends over time
- 🔍 Flaky test detection
- ⏱️ Duration analysis
- 📊 Pass/fail rate tracking

### Reporting
- 📝 Detailed test run reports
- 🔗 Link tests to Jira issues
- 📧 Email notifications on failures
- 💬 Slack integration

### Collaboration
- 👥 Share results with team
- 💬 Comment on test failures
- 🏷️ Assign ownership
- 📋 Test plans and runs

---

## 🎯 Test Organization

Tests are organized in Testomat as:

```
HearingClinic/
├── Backend Tests/
│   ├── DocTypes/
│   │   ├── Value Add Card (19 tests)
│   │   └── Card Transaction (13 tests)
│   ├── Business Logic/
│   │   ├── Customer ID (15 tests)
│   │   └── Duplicate Check (12 tests)
│   └── API/
│       └── REST Endpoints (12+ tests)
├── Frontend Tests/
│   └── UI Components (15+ tests)
└── Integration Tests/
    └── Workflows (15+ tests)
```

**Total: 100+ automated tests**

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [README_TESTOMAT.md](README_TESTOMAT.md) | This file - Quick reference |
| [TESTOMAT_INTEGRATION.md](TESTOMAT_INTEGRATION.md) | Complete integration guide |
| [TESTING.md](TESTING.md) | General testing guide |
| [QUICKSTART_TESTING.md](QUICKSTART_TESTING.md) | Quick start for testing |
| [TEST_SUMMARY.md](TEST_SUMMARY.md) | Test coverage summary |

---

## 🛠️ Troubleshooting

### API Key Not Working
```bash
# Check if set
echo $TESTOMATIO

# Set manually
export TESTOMATIO=your-api-key

# Make permanent
echo 'export TESTOMATIO=your-api-key' >> ~/.bashrc
source ~/.bashrc
```

### Tests Not Appearing
```bash
# Import tests to Testomat
npx check-tests@latest pytest 'apps/hearingclinic/**/*.py' --update-ids
npm run test:testomat:import
```

### Dependencies Missing
```bash
# Backend
pip install -r requirements-test.txt

# Frontend
npm install
```

---

## 📖 Quick Commands

| Task | Command |
|------|---------|
| **Setup** | `./setup_testomat.sh API_KEY` |
| **Run all** | `./run_tests_testomat.sh` |
| **Backend** | `pytest --testomatio=$TESTOMATIO` |
| **Frontend** | `npm run test:testomat:report` |
| **Import** | `npm run test:testomat:import` |
| **View** | https://app.testomat.io |

---

## 🌟 Benefits

### Before Testomat
- ❌ Tests scattered across files
- ❌ No historical tracking
- ❌ Manual result review
- ❌ No team visibility
- ❌ Hard to find flaky tests

### After Testomat
- ✅ Centralized dashboard
- ✅ Complete history and trends
- ✅ Automatic reporting from CI
- ✅ Team collaboration
- ✅ Flaky test detection
- ✅ Test analytics

---

## 🎓 Learning Resources

- **Testomat Docs**: https://docs.testomat.io
- **Video Tutorials**: https://www.youtube.com/c/testomatio
- **Blog**: https://testomat.io/blog
- **Support**: support@testomat.io

---

## ✨ Pro Tips

1. **Tag Your Tests** - Use markers for better organization
   ```python
   @pytest.mark.smoke
   @pytest.mark.critical
   def test_important_feature():
       pass
   ```

2. **Create Test Plans** - Group tests for different scenarios
   - Smoke tests (fast, critical)
   - Regression tests (comprehensive)
   - Nightly tests (full suite)

3. **Review Regularly** - Check Testomat dashboard daily
   - Identify flaky tests
   - Track coverage gaps
   - Monitor test duration

4. **Integrate with Jira** - Link tests to user stories
   ```python
   # @T96f8b2c1 @JIRA:HC-123
   def test_feature():
       pass
   ```

5. **Use Notifications** - Set up alerts for failures
   - Email on critical test failures
   - Slack notifications for team
   - Custom webhooks

---

## 🤝 Support

Need help with Testomat integration?

1. Check [TESTOMAT_INTEGRATION.md](TESTOMAT_INTEGRATION.md) for details
2. Visit https://docs.testomat.io
3. Contact support@testomat.io
4. Join Testomat community on Slack

---

## 📝 License

This integration follows the same MIT license as the HearingClinic app.

**Maintained By**: Thomas Roch (thomas@dierochs.de)
**Last Updated**: 2025-12-07
**Version**: 1.0
