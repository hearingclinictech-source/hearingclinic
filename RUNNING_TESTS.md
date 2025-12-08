# Running Tests - Important Notes

## ⚠️ How to Run Tests Properly

ERPNext/Frappe tests **must** be run using the `bench` command, not standalone `pytest`. This is because Frappe needs to:
- Initialize the database connection
- Load site configuration
- Set up the ORM and caching
- Initialize hooks and modules

## ✅ Correct Way to Run Tests

### Option 1: Using Bench (Recommended)
```bash
# From frappe-bench directory
bench --site [site-name] run-tests --app hearingclinic

# With coverage
bench --site [site-name] run-tests --app hearingclinic --coverage

# Specific test module
bench --site [site-name] run-tests --module hearingclinic.hearingclinic.doctype.value_add_card.test_value_add_card

# Specific test class/method
bench --site [site-name] run-tests --module hearingclinic.hearingclinic.doctype.value_add_card.test_value_add_card --test TestValueAddCard.test_card_value_calculation
```

### Option 2: Using Test Runner Scripts
```bash
# From apps/hearingclinic directory
./run_tests_with_reporting.sh [site-name]

# Or the Testomat-focused version
./run_tests_testomat.sh [site-name]
```

## ❌ Don't Do This

```bash
# This will FAIL - Frappe not initialized
pytest apps/hearingclinic/hearingclinic
# Error: ModuleNotFoundError: No module named 'frappe'
```

## 🔧 Why This Matters

ERPNext tests use:
- `frappe.get_doc()` - Requires database connection
- `frappe.db` - Database operations
- `FrappeTestCase` - Special test base class
- Site-specific configuration
- DocType metadata

All of these require Frappe to be properly initialized, which only `bench run-tests` does.

## 📊 Testomat.io Integration

For Testomat.io reporting, the workflow is:

1. **Run tests via bench** → Generates JUnit XML
2. **Send XML to Testomat** → Using @testomatio/reporter CLI

```bash
# Step 1: Run tests
bench --site mysite run-tests --app hearingclinic --junit-xml-output results.xml

# Step 2: Send to Testomat (if TESTOMATIO is set)
if [ -n "$TESTOMATIO" ]; then
    npx @testomatio/reporter --from-junit results.xml --title "My Tests"
fi
```

This is exactly what `run_tests_with_reporting.sh` does automatically!

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| All tests | `bench --site X run-tests --app hearingclinic` |
| With coverage | Add `--coverage` |
| With Testomat | `./run_tests_with_reporting.sh X` |
| Specific module | Add `--module path.to.test` |
| Verbose | Add `--verbose` |
| Parallel | Add `--parallel 4` |

## 💡 Pro Tips

### 1. Use Site Name
Always specify your actual site name:
```bash
./run_tests_with_reporting.sh development.localhost
```

### 2. Check JUnit XML
After running, check if XML was generated:
```bash
ls -la test-results.xml
cat test-results.xml | head -30
```

### 3. Manual Testomat Upload
You can manually send results anytime:
```bash
export TESTOMATIO=your-key
npx @testomatio/reporter --from-junit test-results.xml --title "Manual Run"
```

### 4. CI/CD Note
In GitHub Actions, we use `bench run-tests` first, then send the XML:
```yaml
- name: Run tests
  run: bench --site test_site run-tests --app hearingclinic --junit-xml-output results.xml

- name: Send to Testomat
  run: npx @testomatio/reporter --from-junit results.xml
```

## 🐛 Troubleshooting

### "ModuleNotFoundError: No module named 'frappe'"
**Problem**: Trying to run pytest directly

**Solution**: Use `bench run-tests` instead

### "Could not find site"
**Problem**: Site name incorrect or doesn't exist

**Solution**:
```bash
# List sites
ls sites/

# Use correct site name
bench --site development.localhost run-tests --app hearingclinic
```

### "No tests collected"
**Problem**: Wrong path or no tests in module

**Solution**: Verify test files exist:
```bash
find apps/hearingclinic -name "test_*.py"
```

## 📚 More Info

- **General Testing**: [TESTING.md](TESTING.md)
- **Testomat Integration**: [TESTOMAT_QUICKSTART.md](TESTOMAT_QUICKSTART.md)
- **Test Coverage**: [TEST_SUMMARY.md](TEST_SUMMARY.md)

---

**Last Updated**: 2025-12-07
