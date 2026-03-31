<script>
	import { tick } from 'svelte';
	import { CATEGORIES } from '$lib/industries.js';

	let messages = $state([]);
	let activeChips = $state([]);
	let inputText = $state('');
	let isTyping = $state(false);
	let showBottomSheet = $state(false);
	let searchQuery = $state('');
	let conversationStep = $state('trading');
	let pendingCategory = $state('');
	let inputDisabled = $state(true);

	let chatArea;

	const filteredCategories = $derived(
		CATEGORIES.filter((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	async function scrollToBottom() {
		await tick();
		if (chatArea) {
			chatArea.scrollTop = chatArea.scrollHeight;
		}
	}

	function addBotMessage(text, chips = [], delay = 600) {
		return new Promise((resolve) => {
			isTyping = true;
			scrollToBottom();
			setTimeout(async () => {
				isTyping = false;
				messages = [...messages, { role: 'bot', text }];
				activeChips = chips;
				await scrollToBottom();
				resolve();
			}, delay);
		});
	}

	function addUserMessage(text) {
		messages = [...messages, { role: 'user', text }];
		activeChips = [];
		scrollToBottom();
	}

	async function startConversation() {
		await addBotMessage(
			'All done \u2013 your ID has been successfully verified',
			[],
			400
		);
		await addBotMessage(
			'In order to open an ANNA account, we need to understand your business better. This is called Know Your Business (KYB)',
			[],
			400
		);
		await addBotMessage(
			'KYB is a legal requirement, so providing clear and complete answers will ensure we get your business up and running with ANNA without delay',
			[],
			400
		);
		await addBotMessage(
			'Depending on your answers we may ask you for supporting documentation and other evidence of your business as part of our compliance checks',
			[{ label: "Yes, let\u2019s do it", value: 'start' }],
			400
		);
	}

	async function handleChip(chip) {
		addUserMessage(chip.label);

		if (conversationStep === 'initial') {
			conversationStep = 'trading';
			await addBotMessage('Have you started trading?', [
				{ label: 'Yes', value: 'yes' },
				{ label: 'No', value: 'no' }
			]);
		} else if (conversationStep === 'trading') {
			if (chip.value === 'yes' || chip.value === 'no') {
				conversationStep = 'describe_intro';
				await addBotMessage('First, please tell us a bit more about your business');
				conversationStep = 'describe';
				inputDisabled = false;
				await addBotMessage(
					'Please describe your business in specific detail \u2014 the industry, your job duties, where your business operates and the products or services you provide',
					[{ label: 'Show me an example', value: 'example', ghost: true }]
				);
			}
		} else if (conversationStep === 'describe') {
			// Ghost chip — does nothing
		} else if (conversationStep === 'confirm') {
			if (chip.value === 'yes') {
				conversationStep = 'done';
				inputDisabled = true;
				await addBotMessage(
					`Great! Your business has been categorised as "<strong>${pendingCategory}</strong>".`
				);
			} else if (chip.value === 'no') {
				conversationStep = 'describe';
				inputDisabled = false;
				await addBotMessage(
					'No problem. Please describe your business again with more detail so we can find a better match.',
					[{ label: 'Show me an example', value: 'example', ghost: true }]
				);
			} else if (chip.value === 'categories') {
				showBottomSheet = true;
			}
		}
	}

	async function handleSend() {
		const text = inputText.trim();
		if (!text || conversationStep !== 'describe') return;

		addUserMessage(text);
		inputText = '';
		inputDisabled = true;
		isTyping = true;
		await scrollToBottom();

		try {
			const res = await fetch('/api/categorise', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ description: text })
			});

			if (!res.ok) throw new Error('API error');

			const data = await res.json();
			isTyping = false;

			if (data.category === 'NEED_MORE_INFO') {
				inputDisabled = false;
				await addBotMessage(
					"I need a bit more detail to categorise your business. Could you tell me more about what your business does, the products or services you offer, and the industry you're in?",
					[{ label: 'Show me an example', value: 'example', ghost: true }],
					300
				);
			} else {
				pendingCategory = data.category;
				conversationStep = 'confirm';
				await addBotMessage(
					`It looks like your business would best be categorised as "<strong>${data.category}</strong>". Does that sound right?`,
					[
						{ label: "Yes, that's right", value: 'yes' },
						{ label: 'No', value: 'no' },
						{ label: 'See all categories', value: 'categories' }
					],
					300
				);
			}
		} catch {
			isTyping = false;
			inputDisabled = false;
			await addBotMessage(
				'Sorry, something went wrong. Please try describing your business again.',
				[],
				300
			);
		}
	}

	async function selectCategory(category) {
		showBottomSheet = false;
		searchQuery = '';
		pendingCategory = category;
		addUserMessage(category);
		conversationStep = 'confirm';
		await addBotMessage(
			`It looks like your business would best be categorised as "<strong>${category}</strong>". Does that sound right?`,
			[
				{ label: "Yes, that's right", value: 'yes' },
				{ label: 'No', value: 'no' },
				{ label: 'See all categories', value: 'categories' }
			],
			300
		);
	}

	function handleKeydown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	// Start conversation on mount
	$effect(() => {
		conversationStep = 'initial';
		startConversation();
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-100 p-4">
	<!-- Phone Shell -->
	<div
		class="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[48px] bg-bg shadow-2xl"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-6 pt-14 pb-3">
			<span class="anna-logo text-coral">ANNA</span>
			<div class="flex gap-3 text-sm">
				<button class="font-medium text-green">Get help</button>
				<button class="font-medium text-dark">Sign out</button>
			</div>
		</div>

		<!-- Chat Area -->
		<div bind:this={chatArea} class="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-2">
			{#each messages as msg}
				{#if msg.role === 'bot'}
					<div class="max-w-[80%] self-start rounded-2xl rounded-bl-[5px] bg-white px-4 py-3 text-[15px] leading-relaxed text-dark">
						{@html msg.text}
					</div>
				{:else}
					<div class="max-w-[70%] self-end rounded-2xl rounded-br-[5px] bg-dark px-4 py-3 text-[15px] leading-relaxed text-white">
						{msg.text}
					</div>
				{/if}
			{/each}

			{#if isTyping}
				<div class="flex max-w-[80px] items-center gap-1 self-start rounded-2xl rounded-bl-[5px] bg-white px-4 py-3">
					<span class="typing-dot"></span>
					<span class="typing-dot delay-1"></span>
					<span class="typing-dot delay-2"></span>
				</div>
			{/if}
		</div>

		<!-- Quick Reply Chips -->
		{#if activeChips.length > 0}
			<div class="flex justify-end gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
				{#each activeChips as chip}
					<button
						onclick={() => handleChip(chip)}
						class="shrink-0 cursor-pointer rounded-xl bg-white px-5 py-3 text-[15px] font-medium text-green shadow-sm transition-colors hover:bg-gray-50"
					>
						{chip.label}
					</button>
				{/each}
			</div>
		{/if}

		<!-- Input Bar -->
		<div class="px-4 pt-1 pb-10">
			<div class="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5">
				<input
					type="text"
					bind:value={inputText}
					onkeydown={handleKeydown}
					placeholder="Describe your business"
					disabled={inputDisabled}
					class="flex-1 bg-transparent text-[15px] text-dark placeholder-gray-400 outline-none disabled:opacity-50"
				/>
				<button aria-label="Attach file" class="shrink-0 text-gray-400 hover:text-gray-600">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
					</svg>
				</button>
				<button aria-label="Take photo" class="shrink-0 text-green hover:text-green/80">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				</button>
				{#if inputText.trim() && !inputDisabled}
					<button
						aria-label="Send message"
						onclick={handleSend}
						class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-green text-white"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" />
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Bottom Sheet Overlay -->
{#if showBottomSheet}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
		<div class="flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[48px] bg-white">
			<!-- Sheet Header -->
			<div class="flex items-center justify-between px-6 pt-14 pb-3">
				<button onclick={() => { showBottomSheet = false; searchQuery = ''; }} class="cursor-pointer text-sm font-medium text-green">
					Close
				</button>
				<span class="text-sm font-medium text-dark">Select a business category</span>
				<span class="w-10"></span>
			</div>

			<!-- Search -->
			<div class="px-6 pb-3">
				<div class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search"
						class="flex-1 bg-transparent text-sm text-dark placeholder-gray-400 outline-none"
					/>
				</div>
			</div>

			<!-- Category List -->
			<div class="flex-1 overflow-y-auto px-6">
				{#each filteredCategories as category}
					<button
						onclick={() => selectCategory(category)}
						class="w-full cursor-pointer border-b border-gray-200 px-1 py-4 text-left text-sm text-dark transition-colors hover:bg-gray-50"
					>
						{category}
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.typing-dot {
		width: 8px;
		height: 8px;
		background-color: #999;
		border-radius: 50%;
		animation: bounce 1.4s infinite ease-in-out both;
	}

	.delay-1 {
		animation-delay: 0.16s;
	}

	.delay-2 {
		animation-delay: 0.32s;
	}

	@keyframes bounce {
		0%,
		80%,
		100% {
			transform: scale(0.6);
			opacity: 0.4;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.anna-logo {
		font-size: 28px;
		font-weight: 800;
		font-style: italic;
		letter-spacing: 1px;
		text-transform: uppercase;
	}
</style>
