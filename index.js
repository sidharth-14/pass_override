import * as core from '@actions/core';
import axios from 'axios';
import * as github from '@actions/github';
import { missing_title, title_length_error, title_titlecase, missing_labels, check_labels, labels_incorrect, missing_body } from './constant.js';

const PAT = core.getInput('PAT');
const discussionBody = github.context.payload.discussion.body;
const lines = discussionBody.split('\n');
const repoName = core.getInput('repo_name');

let title = '';
let labels = [];
let body = '';

const missingFields = [];

for (let i = 1; i < lines.length; i++) {

    const line = lines[i].trim();

    if (line.startsWith('title:')) {

        title = line.replace('title:', '').trim().replaceAll('"', '');

    } else if (line.startsWith('labels:')) {
        const labelsText = line.replace('labels:', '').trim();
        labels = JSON.parse(labelsText);
    } else if (line.startsWith('body:')) {

        body = line.replace('body:', '').trim().replaceAll('"', '');

    }
}
if (!title) {
    missingFields.push(missing_title);
} else {
    const titleWords = title.split(' ');
    if (titleWords.length >= 5) {
        missingFields.push(title_length_error);
    } else if (!isTitleCase(title)) {
        missingFields.push(title_titlecase)
    }
}
if (!labels.length) {
    missingFields.push(missing_labels);
}

const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${PAT}`
};

const apiUrl = `https://api.github.com/repos/${repoName}/labels`;
axios
    .get(apiUrl, { headers })
    .then(response => {
        const repo_labels = response.data.map(label => ({
            name: label.name,
            node_id: label.node_id // Retrieve the label ID
        }));
        console.log('Labels:', repo_labels);

        if (Array.isArray(labels)) {
            const labelIds = labels.map(labelName => {
                const label = repo_labels.find(labelObj => labelObj.name === labelName);
                return label ? label.node_id : null;
            });

            if (labelIds.includes(null)){
                missingFields.push(labels_incorrect);
            }else{
                console.log('Label IDs:', labelIds);
                core.setOutput("label_id", labelIds);
            }
        } else {
            console.error('disc_labels is not an array');
        }
    })
    .catch(error => {
        console.error('Error fetching labels:', error.message);
        missingFields.push(check_labels);
    });

if (!body) {
    missingFields.push(missing_body);
}

core.setOutput('if_missing', missingFields.length)
if (missingFields.length > 0) {
    const missingFieldsMessage = missingFields.join('\n');
    const words = missingFieldsMessage.split(' ');
    const missingFieldsMessages = words.join('\\space ');
    core.setOutput('Missing', missingFieldsMessages);
    console.log('Missing Fields:\n', missingFieldsMessages);
}
function isTitleCase(str) {
    const words = str.split(' ');
    return words.every(word => /^[A-Z][a-z]*$/.test(word));
  }
core.setOutput('override_title', title);
core.setOutput('override_labels', labels);
core.setOutput('override_body', body);
