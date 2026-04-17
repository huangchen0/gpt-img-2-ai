-- Showcase videos from Twitter demos
-- Insert these video showcases into the database

INSERT INTO "public"."showcase" ("id", "user_id", "title", "prompt", "image", "created_at", "tags", "description") VALUES
-- First batch (early high-heat demos)
('v1-1min-war-scene-001', '95042cdc-4465-41a5-a3cf-fbeb5fb2a6de', '1 Minute War Scene Cinematography', 'A cinematic war scene with intense action. Camera starts with a wide shot of soldiers advancing through smoke-filled trenches, then pans to a close-up of a determined soldier loading his rifle, followed by a dynamic tracking shot of artillery firing, ending with an overhead drone-like view of the battlefield chaos. Realistic lighting, high detail, 1080p.', '/showcases/videos/1min-war-scene.mp4', NOW(), 'war,cinematic,action,demo', 'Epic 1-minute war scene with multiple camera angles and dynamic action sequences'),

('v1-man-of-steel-002', '95042cdc-4465-41a5-a3cf-fbeb5fb2a6de', 'Man of Steel Recreation', 'Recreate the iconic Superman flight scene from Man of Steel: Superman soaring through clouds at high speed, camera circling around him, dramatic lighting and wind effects, realistic physics.', '/showcases/videos/man-of-steel.mp4', NOW(), 'superman,cinematic,recreation,movie', 'Recreation of the iconic Superman flight scene from Man of Steel'),

('v1-piano-girl-003', '95042cdc-4465-41a5-a3cf-fbeb5fb2a6de', 'Piano Girl Performance', 'Ultra-realistic girl playing piano with smooth hand movements and natural expressions. Long continuous shot with excellent character consistency.', '/showcases/videos/piano-girl.mp4', NOW(), 'piano,music,realistic,performance', 'Incredibly realistic piano performance with natural hand movements and expressions'),

('v1-45s-long-shot-004', '95042cdc-4465-41a5-a3cf-fbeb5fb2a6de', '45 Second Long Shot Demo', 'Smooth 45-second continuous shot demonstrating start-frame and end-frame control for extended video generation.', '/showcases/videos/45s-long-shot.mp4', NOW(), 'long-shot,cinematic,demo,technical', 'Demonstrates extended video generation with start/end frame control'),

('v1-2min-fight-005', '95042cdc-4465-41a5-a3cf-fbeb5fb2a6de', '2 Minute Fight Scene', 'Complete 2-minute fight choreography with full story arc and character consistency throughout.', '/showcases/videos/2min-fight.mp4', NOW(), 'fight,action,long-form,choreography', 'Full 2-minute fight choreography demonstrating long-form generation capability'),

('v1-17s-cinematic-006', '95042cdc-4465-41a5-a3cf-fbeb5fb2a6de', '17 Second Cinematic Shot', 'Quick cinematic demonstration with dynamic camera movements and professional lighting.', '/showcases/videos/17s-cinematic.mp4', NOW(), 'cinematic,quick,demo,lighting', 'Professional cinematic shot with dynamic camera work'),

-- Second batch (latest demos)
('v2-nike-ad-007', '95042cdc-4465-41a5-a3cf-fbeb5fb2a6de', 'Nike Style Advertisement', 'Complete Nike-style commercial with multiple scenes and lip-synced audio. Professional advertisement quality.', '/showcases/videos/nike-ad.mp4', NOW(), 'nike,commercial,advertisement,audio', 'Professional commercial-quality advertisement with audio sync'),

('v2-character-consistency-008', '95042cdc-4465-41a5-a3cf-fbeb5fb2a6de', 'Character Consistency Demo', 'Short demo showing exceptional character consistency and quality, demonstrating Bytedance AI capabilities.', '/showcases/videos/character-consistency.mp4', NOW(), 'consistency,demo,quality,bytedance', 'Demonstrates exceptional character consistency throughout the video'),

('v2-f1-prediction-009', '95042cdc-4465-41a5-a3cf-fbeb5fb2a6de', 'F1 Racing Metaphor', 'Multi-car racing scene used to visualize prediction market dynamics with smooth camera work.', '/showcases/videos/f1-prediction.mp4', NOW(), 'f1,racing,metaphor,visualization', 'Creative use of racing metaphor for prediction market visualization'),

('v2-chat-prompt-010', '95042cdc-4465-41a5-a3cf-fbeb5fb2a6de', 'Natural Language Generation', 'Daily scene generated from conversational prompt, demonstrating natural language understanding capabilities.', '/showcases/videos/chat-prompt.mp4', NOW(), 'natural-language,daily,demo,nlp', 'Generated from natural conversational prompts without complex formatting'),

('v2-funny-scene-011', '95042cdc-4465-41a5-a3cf-fbeb5fb2a6de', 'Funny Sample Scene', '15-second humorous demonstration showing creative capabilities and entertaining content generation.', '/showcases/videos/funny-scene.mp4', NOW(), 'funny,creative,short,entertainment', 'Humorous demonstration of creative content generation'),

('v2-sora-comparison-012', '95042cdc-4465-41a5-a3cf-fbeb5fb2a6de', 'Sora vs Seedance Comparison', 'Side-by-side comparison demonstrating long video generation capabilities against OpenAI Sora.', '/showcases/videos/sora-comparison.mp4', NOW(), 'comparison,sora,benchmark,openai', 'Benchmark comparison with OpenAI Sora for long video generation'),

('v2-6s-multishot-013', '95042cdc-4465-41a5-a3cf-fbeb5fb2a6de', '6 Second Multi-Shot', 'Fast-paced 6-second cinematic with multiple camera angles and smooth transitions between shots.', '/showcases/videos/6s-multishot.mp4', NOW(), 'multi-shot,fast,cinematic,transitions', 'Rapid multi-angle shot demonstrating smooth transitions');

-- Note: Run this SQL in your database to add these showcase videos
-- The videos are stored in public/showcases/videos/ directory
-- Make sure the user_id matches an existing user in your database
