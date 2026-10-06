<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Roles (shelter/adopter) live in `user_roles`, set at signup by a DB trigger from signup metadata; why: never store roles on profiles.
- Pet photos go to the private `pet-photos` bucket and are stored on pets as long-lived signed URLs; why: workspace blocks public buckets.
- Approving an adoption request marks the pet adopted via a DB trigger; why: keeps status consistent regardless of client.
