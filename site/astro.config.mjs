// @ts-check
import {defineConfig} from 'astro/config';
import starlight from '@astrojs/starlight';
import './src/styles/custom.css';

// https://astro.build/config
export default defineConfig({
    integrations: [
        starlight({
            title: 'Engineering Playbook',
            social: [
                {
                    icon: 'github',
                    label: 'GitHub',
                    href: 'https://github.com/withastro/starlight'
                }
            ],
            customCss: [
                './src/styles/custom.css',
            ],
            sidebar: [
                {
                    label: 'Architectures',
                    items: [
                        {autogenerate: {directory: 'architectures'}},
                    ],
                },
                {
                    label: 'Checklists',
                    items: [
                        {autogenerate: {directory: 'checklists'}},
                    ],
                },
                {
                    label: 'Decisions',
                    items: [
                        {autogenerate: {directory: 'decisions'}},
                    ],
                },
                {
                    label: 'Principles',
                    items: [
                        {autogenerate: {directory: 'principles'}},
                    ],
                },
                {
                    label: 'Research',
                    items: [
                        {autogenerate: {directory: 'research'}},
                    ],
                },
            ],
        }),
    ],
});