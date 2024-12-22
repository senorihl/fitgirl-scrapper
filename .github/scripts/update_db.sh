#!/usr/bin/env bash

VERBOSE=false
IS_CI=false
DRY=false

command_help () {
    echo
    echo "Update database since previous run."
    echo
    echo -e "\033[33mUsage:\033[0m"
    echo "    update_db.sh <options>"
    echo
    echo -e "\033[33mDescription:\033[0m"
    echo "    This command fetch last run date from lastrun.txt and run the command to append new values to out.csv and out.json"
    echo
    echo -e "\033[33mOptions:\033[0m"
    echo -e "    \033[32m-h --help\033[0m                       Show this screen."
    echo -e "    \033[32m-v --verbose\033[0m                    Display executed commands."
    echo
    echo -e "    \033[32m--ci\033[0m                            Enable continuous integration mode."
    echo
    exit 1
}

while [[ $# -gt 0 ]]
do
    key="$1"

    case $key in
        -h|--help)
            command_help
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --ci)
            IS_CI=true
            VERBOSE=true
            shift
            ;;
        *)    # unknown option
            shift
            ;;
    esac
done

ci_group () {
    if [[ "$IS_CI" = "true" ]]; then
        echo "::group::$1"
    else
        echo "$1"
    fi
}

ci_group_end () {
    if [[ "$IS_CI" = "true" ]]; then
        echo "::endgroup::"
    fi
}

log () {
  [[ "$VERBOSE" = "true" ]] && echo -e "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] \033[36m$1\033[0m" || true
}

command () {
    local  __resultvar=$2
    local command_to_run=$1
    log "$command_to_run"

    if [[ "$DRY" = "false" ]]; then
        if [[ "$__resultvar" ]]; then
            eval "$__resultvar=\`$command_to_run\`"
        else
            eval $command_to_run
        fi
    fi
}

ci_group "Prepare lastrun.txt"
command "touch db/lastrun.txt" # ensure the last run file exists
NEW_RUN_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ" | sed 's/\r$//')"
OLD_RUN_TIME=$(cat db/lastrun.txt | head -1 | sed 's/\r$//')
log "OLD_RUN_TIME: $OLD_RUN_TIME"
log "NEW_RUN_TIME: $NEW_RUN_TIME"
command "echo \"$NEW_RUN_TIME\" > db/lastrun.txt"
ci_group_end

ci_group "Run built executable"
command "node dist/index.js --csv db/out.csv --json db/out.json"
ci_group_end