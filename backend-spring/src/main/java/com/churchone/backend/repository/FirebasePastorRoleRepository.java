package com.churchone.backend.repository;

import com.churchone.backend.config.FirebaseProperties;
import com.churchone.backend.security.FirebaseServiceUnavailableException;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Repository
public class FirebasePastorRoleRepository implements PastorRoleRepository {

    private static final String PASTOR_ROLES_PATH = "admins";

    private final ObjectProvider<FirebaseDatabase> databaseProvider;
    private final FirebaseProperties properties;

    public FirebasePastorRoleRepository(
            ObjectProvider<FirebaseDatabase> databaseProvider,
            FirebaseProperties properties
    ) {
        this.databaseProvider = databaseProvider;
        this.properties = properties;
    }

    @Override
    public String findRoleByEmail(String normalizedEmail) {
        FirebaseDatabase database = databaseProvider.getIfAvailable();

        if (database == null) {
            throw new FirebaseServiceUnavailableException(
                    "Firebase Realtime Database is not configured on this deployment."
            );
        }

        String emailKey = toFirebaseEmailKey(normalizedEmail);
        CompletableFuture<DataSnapshot> snapshotFuture = new CompletableFuture<>();

        database
                .getReference(PASTOR_ROLES_PATH)
                .child(emailKey)
                .addListenerForSingleValueEvent(new ValueEventListener() {
                    @Override
                    public void onDataChange(DataSnapshot snapshot) {
                        snapshotFuture.complete(snapshot);
                    }

                    @Override
                    public void onCancelled(DatabaseError error) {
                        snapshotFuture.completeExceptionally(
                                new IllegalStateException(
                                        "Firebase rejected the Pastor-role lookup: "
                                                + error.getCode()
                                )
                        );
                    }
                });

        try {
            DataSnapshot snapshot = snapshotFuture.get(
                    properties.getRoleLookupTimeout().toMillis(),
                    TimeUnit.MILLISECONDS
            );

            Object value = snapshot.getValue();
            return value == null ? "" : value.toString().trim().toLowerCase();
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new FirebaseServiceUnavailableException(
                    "The Firebase Pastor-role lookup was interrupted.",
                    error
            );
        } catch (ExecutionException | TimeoutException error) {
            throw new FirebaseServiceUnavailableException(
                    "The Firebase Pastor-role lookup could not be completed.",
                    error
            );
        }
    }

    static String toFirebaseEmailKey(String normalizedEmail) {
        return normalizedEmail.replace('.', ',');
    }
}
