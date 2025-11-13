import json
import os

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# Build path to fixtures directory
fixtures_dir = os.path.join(script_dir, '..', 'fixtures')
item_group_file = os.path.join(fixtures_dir, 'item_group.json')

# Read the fixture
with open(item_group_file, 'r') as f:
    items = json.load(f)

# Sort: parents before children
# Level 0: no parent
# Level 1: parent = "All Item Groups"
# Level 2+: parent in previous levels

sorted_items = []
remaining = items.copy()

# First, add items with no parent
for item in remaining[:]:
    if not item.get('parent_item_group'):
        sorted_items.append(item)
        remaining.remove(item)

# Then iteratively add items whose parents are already added
while remaining:
    added = False
    for item in remaining[:]:
        parent = item.get('parent_item_group')
        if any(i['name'] == parent for i in sorted_items):
            sorted_items.append(item)
            remaining.remove(item)
            added = True
    
    if not added:
        # Circular reference or orphan
        print(f"Warning: Could not place {remaining}")
        sorted_items.extend(remaining)
        break

# Write back
with open(item_group_file, 'w') as f:
    json.dump(sorted_items, f, indent=1)

print(f"Sorted {len(sorted_items)} Item Groups")