package com.ebooking.modules.event;

import java.util.UUID;

import com.ebooking.modules.identity.UserAccount;
import com.ebooking.shared.domain.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "events")
public class Event extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id")
    private UserAccount organizer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "genre_id")
    private Genre genre;

    private String title;
    private String description;
    private String category;
    private boolean published;

    protected Event() {
    }

    public Event(
            UUID id,
            UserAccount organizer,
            Genre genre,
            String title,
            String description,
            String category,
            boolean published) {
        super(id);
        this.organizer = organizer;
        this.genre = genre;
        this.title = title;
        this.description = description;
        this.category = category;
        this.published = published;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getCategory() {
        return category;
    }

    public boolean isPublished() {
        return published;
    }

    public Genre getGenre() {
        return genre;
    }

    public void setPublished(boolean published) {
        this.published = published;
    }
}
