#!/bin/bash

set -e

echo "Testing sitemap generation..."

timeout 120s bun run sitemap:generate || {
  echo "Sitemap generation failed or timed out"
  exit 1
}

if [ ! -f "./public/app-sitemap.xml" ]; then
  echo "app-sitemap.xml was not found"
  exit 1
fi

if [ ! -s "./public/app-sitemap.xml" ]; then
  echo "app-sitemap.xml is empty"
  exit 1
fi

echo "Sitemap generation test passed!"
