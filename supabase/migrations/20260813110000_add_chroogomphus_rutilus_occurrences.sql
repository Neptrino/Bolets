insert into public.occurrence_taxa (dataset_key, species_id, scientific_name)
values ('8583f4f6-f762-11e1-a439-00145eb45e9a', 'chroogomphus-rutilus', 'Chroogomphus rutilus')
on conflict (dataset_key, species_id) do update
set scientific_name = excluded.scientific_name;
