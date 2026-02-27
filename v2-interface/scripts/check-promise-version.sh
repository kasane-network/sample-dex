#!/bin/bash

# We are using a Promise polyfill for Datadog to catch unhandled promise rejections
# This script ensures we use exact same version as React Native

# Function to extract version from package.json
get_version() {
    local package_json="$1"
    local package_name="$2"
    grep -o "\"$package_name\": *\"[^\"]*\"" "$package_json" | grep -o '[0-9][0-9.]*'
}

# Get package's promise version
project_promise_version=$(get_version "package.json" "promise")

if [ -z "$project_promise_version" ]; then
    echo "Error: 'promise' is not listed in your package's dependencies or devDependencies."
    exit 1
fi

# Get current directory, where script is located
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )


if [ ! -f "$react_native_package_json" ]; then
    exit 1
fi

react_native_promise_version=$(get_version "$react_native_package_json" "promise")

if [ -z "$react_native_promise_version" ]; then
    exit 1
fi

# Compare versions
if [ "$project_promise_version" != "$react_native_promise_version" ]; then
    echo "Error: your package uses promise@$project_promise_version, but React Native uses promise@$react_native_promise_version. Set 'promise' version to '$react_native_promise_version' in package.json to fix this error."
    exit 1
else
    exit 0
fi
