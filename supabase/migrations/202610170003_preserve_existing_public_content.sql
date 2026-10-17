-- Import the exact content already shown in src/lib/data.ts. No new club claims are invented.
-- Existing CMS entries (including unpublished entries) take precedence and are never overwritten.
insert into public.achievements(title,description,year,category,image_url,featured,published,display_order,competition,rank,team,major)
select 'Autonomous Robotics Challenge','AIR 4 in ISRO ASCEND 2026, earned by Galactic Gearheads.',2026,'ISRO ASCEND','https://images.unsplash.com/photo-1517976487492-5750f3195933?w=1200&h=800&fit=crop&auto=format',true,true,0,'ISRO ASCEND','AIR 4','Galactic Gearheads',true
where not exists(select 1 from public.achievements where title='Autonomous Robotics Challenge' and year=2026);
insert into public.achievements(title,description,year,category,image_url,featured,published,display_order,competition,rank,team,major)
select 'ROBOCON India robot system','AIR 9 at ROBOCON India 2026, continuing the club’s run in India’s national robotics competition circuit.',2026,'ROBOCON India','https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=800&fit=crop&auto=format',true,true,1,'ROBOCON India','AIR 9','PICT Robotics Club',true
where not exists(select 1 from public.achievements where title='ROBOCON India robot system' and year=2026);
insert into public.achievements(title,description,year,category,image_url,featured,published,display_order,competition,rank,team,major)
select 'Intelligent robotics challenge','AIR 1 in ISRO IROC-U 2025 — a national title earned by Galactic Gearheads.',2025,'ISRO IROC-U','https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=800&fit=crop&auto=format',true,true,2,'ISRO IROC-U','AIR 1','Galactic Gearheads',true
where not exists(select 1 from public.achievements where title='Intelligent robotics challenge' and year=2025);
insert into public.achievements(title,description,year,category,image_url,featured,published,display_order,competition,rank,team,major)
select 'ROBOCON India robot system','AIR 13 at ROBOCON India 2025.',2025,'ROBOCON India','https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=800&h=600&fit=crop&auto=format',false,true,3,'ROBOCON India','AIR 13','PICT Robotics Club',false
where not exists(select 1 from public.achievements where title='ROBOCON India robot system' and year=2025);
insert into public.achievements(title,description,year,category,image_url,featured,published,display_order,competition,rank,team,major)
select 'ROBOCON India robot system','All India Rank 6 at ROBOCON India 2022.',2022,'ROBOCON India','https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=800&h=600&fit=crop&auto=format',true,true,4,'ROBOCON India','AIR 6','PICT Robotics Club',true
where not exists(select 1 from public.achievements where title='ROBOCON India robot system' and year=2022);
insert into public.achievements(title,description,year,category,image_url,featured,published,display_order,competition,rank,team,major)
select 'ROBOCON India robot system','All India Rank 4 at ROBOCON India 2014.',2014,'ROBOCON India','https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=600&fit=crop&auto=format',true,true,5,'ROBOCON India','AIR 4','PICT Robotics Club',true
where not exists(select 1 from public.achievements where title='ROBOCON India robot system' and year=2014);
insert into public.achievements(title,description,year,category,image_url,featured,published,display_order,competition,rank,team,major)
select 'Line Following Robot','First and second place in the VIT Crescendo line following board competition.',2026,'VIT Crescendo','https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop&auto=format',false,true,6,'VIT Crescendo','1st / 2nd','PICT Robotics Club',false
where not exists(select 1 from public.achievements where title='Line Following Robot' and year=2026);
insert into public.achievements(title,description,year,category,image_url,featured,published,display_order,competition,rank,team,major)
select 'Robotics Sprint','National finalist in the e-Yantra Robotics Sprint.',2026,'e-Yantra Robotics Sprint','https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=800&h=600&fit=crop&auto=format',false,true,7,'e-Yantra Robotics Sprint','Finalist','PICT Robotics Club',false
where not exists(select 1 from public.achievements where title='Robotics Sprint' and year=2026);
insert into public.projects(title,description,year,category,image_url,published,display_order,slug,tags)
select 'Aether — Autonomous Quadcopter','A GPS-denied autonomous drone using visual-inertial odometry for indoor inspection.',2026,'Autonomous','https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&h=650&fit=crop&auto=format',true,0,'aether-quad',array['PX4','ROS 2','Computer Vision','GPS-denied']::text[]
where not exists(select 1 from public.projects where title='Aether — Autonomous Quadcopter' and year=2026) on conflict do nothing;
insert into public.projects(title,description,year,category,image_url,published,display_order,slug,tags)
select 'Pathfinder — Warehouse AGV','A differential-drive AGV performing autonomous navigation and dynamic obstacle avoidance.',2025,'Autonomous','https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=900&h=650&fit=crop&auto=format',true,1,'pathfinder-agv',array['LiDAR','SLAM','ROS','Nav2']::text[]
where not exists(select 1 from public.projects where title='Pathfinder — Warehouse AGV' and year=2025) on conflict do nothing;
insert into public.projects(title,description,year,category,image_url,published,display_order,slug,tags)
select 'Manipulo — 5-DOF Robotic Arm','A 5-DOF arm with closed-loop control and vision-guided pick-and-place.',2025,'Mechanical','https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&h=650&fit=crop&auto=format',true,2,'gripper-arm',array['Inverse Kinematics','CAN Bus','STM32']::text[]
where not exists(select 1 from public.projects where title='Manipulo — 5-DOF Robotic Arm' and year=2025) on conflict do nothing;
insert into public.projects(title,description,year,category,image_url,published,display_order,slug,tags)
select 'LineHawk — High-Speed Line Follower','A 16-sensor line-following robot tuned for sub-metre-per-second track times.',2024,'Embedded','https://images.unsplash.com/photo-1563207153-f403bf289096?w=900&h=650&fit=crop&auto=format',true,3,'line-hawk',array['PID','ATmega','Sensor Array']::text[]
where not exists(select 1 from public.projects where title='LineHawk — High-Speed Line Follower' and year=2024) on conflict do nothing;
insert into public.projects(title,description,year,category,image_url,published,display_order,slug,tags)
select 'VisSort — Vision Sorting Cell','A conveyor-based cell classifying and sorting objects in real time.',2024,'Vision','https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=900&h=650&fit=crop&auto=format',true,4,'vis-sort',array['OpenCV','YOLO','Conveyor']::text[]
where not exists(select 1 from public.projects where title='VisSort — Vision Sorting Cell' and year=2024) on conflict do nothing;
insert into public.projects(title,description,year,category,image_url,published,display_order,slug,tags)
select 'Terra Mk-III — Mars Rover','A rocker-bogie rover with autonomous traversal and a science payload.',2023,'Software','https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=900&h=650&fit=crop&auto=format',true,5,'rover-mk3',array['ROS','Rocker-Bogie','Telemetry']::text[]
where not exists(select 1 from public.projects where title='Terra Mk-III — Mars Rover' and year=2023) on conflict do nothing;
