#!/bin/bash

# Fix unescaped entities
sed -i '' "s/Don't have an account/Don\&apos;t have an account/g" app/login/page.js
sed -i '' "s/Don't have an account/Don\&apos;t have an account/g" app/page.js

